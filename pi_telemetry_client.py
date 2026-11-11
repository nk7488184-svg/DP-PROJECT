#!/usr/bin/env python3
"""
RoadSentinel Raspberry Pi Edge Telemetry Client (Zero-AI Edge Node)
===================================================================
Collects Doppler radar speed measurements and camera snapshots on the Pi,
and streams them to the central FastAPI analytics backend over HTTP/REST.

Architecture Note:
- ALL heavy machine learning (YOLOv8 vehicle classification, license plate
  localization, and EasyOCR plate recognition) runs on the central backend/laptop.
- The Raspberry Pi performs ZERO inference, keeping CPU usage < 5% and RAM usage < 60MB.
"""

import os
import sys
import time
import json
import base64
import argparse
import threading
from datetime import datetime, timezone
from pathlib import Path

# Only 1 external dependency required: pip install requests
try:
    import requests
except ImportError:
    print("Error: 'requests' module not found. Install it with: pip3 install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration (Can also be overridden via command-line flags)
# ---------------------------------------------------------------------------
DEFAULT_BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
DEFAULT_DEVICE_ID = os.environ.get("DEVICE_ID", "RPI4_CAMERA_UNIT_01")
DEFAULT_ROAD_NAME = os.environ.get("ROAD_NAME", "Campus Test Corridor")
DEFAULT_POSTED_LIMIT = float(os.environ.get("POSTED_LIMIT", "20.0"))
DEFAULT_OVERSPEED_THRESHOLD = float(os.environ.get("OVERSPEED_THRESHOLD", "24.0"))
DEFAULT_POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL", "2.0"))   # seconds between radar reads
DEFAULT_SUMMARY_INTERVAL = int(os.environ.get("SUMMARY_INTERVAL", "60")) # seconds per aggregated summary

TEMP_IMG_DIR = Path("/tmp/roadsentinel_captures")
TEMP_IMG_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Hardware Sensor Adapters (Radar & Camera)
# ---------------------------------------------------------------------------

class RadarSensorAdapter:
    """
    Adapter for Doppler radar speed sensors (e.g. HLK-LD2415H 24GHz UART,
    OmniPreSense OPS24x, or serial radar modules).
    Falls back to synthetic traffic generator if hardware is not connected.
    """
    def __init__(self, serial_port: str = None, baud_rate: int = 115200):
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.serial_conn = None

        if serial_port and os.path.exists(serial_port):
            try:
                import serial
                self.serial_conn = serial.Serial(serial_port, baud_rate, timeout=1)
                print(f"[Radar] Connected to hardware sensor on {serial_port} @ {baud_rate} baud")
            except Exception as e:
                print(f"[Radar Warning] Could not open serial port {serial_port}: {e}")

    def read_speed(self) -> float:
        """
        Reads speed in km/h from radar sensor.
        If no vehicle detected, returns 0.0.
        """
        if self.serial_conn:
            try:
                line = self.serial_conn.readline().decode("utf-8", errors="ignore").strip()
                # Parse speed from radar ASCII output (e.g. "V=42.5 km/h" or raw float)
                if line:
                    import re
                    match = re.search(r"[-+]?\d*\.\d+|\d+", line)
                    if match:
                        return abs(float(match.group(0)))
            except Exception as e:
                print(f"[Radar Error] Serial read error: {e}")
            return 0.0

        # Simulated traffic distribution when running without radar hardware:
        import random
        # 60% chance of a passing vehicle in this interval
        if random.random() < 0.65:
            # 85% normal compliant traffic, 15% overspeeding breaches
            if random.random() < 0.85:
                return round(random.gauss(26.5, 4.2), 1)
            else:
                return round(random.uniform(36.0, 68.0), 1)
        return 0.0


class CameraAdapter:
    """
    Adapter for Pi Camera Module (Picamera2, legacy picamera, or USB OpenCV camera).
    """
    def __init__(self):
        self.backend_type = None

        # Check for Picamera2 (modern Raspberry Pi OS Bookworm/Bullseye)
        try:
            from picamera2 import Picamera2
            self.picam2 = Picamera2()
            config = self.picam2.create_still_configuration(main={"size": (1920, 1080)})
            self.picam2.configure(config)
            self.picam2.start()
            self.backend_type = "picamera2"
            print("[Camera] Picamera2 initialized in 1080p mode.")
            return
        except Exception:
            pass

        # Check for legacy picamera
        try:
            from picamera import PiCamera
            self.backend_type = "picamera_legacy"
            print("[Camera] Legacy PiCamera library detected.")
            return
        except Exception:
            pass

        # Check for OpenCV (USB Webcams / CSI v4l2)
        try:
            import cv2
            self.cap = cv2.VideoCapture(0)
            if self.cap.isOpened():
                self.backend_type = "opencv"
                print("[Camera] USB/V4L2 camera detected via OpenCV.")
                return
        except Exception:
            pass

        print("[Camera Note] No physical camera attached. Synthetic snapshot generator active.")
        self.backend_type = "mock"

    def capture(self, filename: str) -> Path:
        target_path = TEMP_IMG_DIR / filename

        if self.backend_type == "picamera2":
            self.picam2.capture_file(str(target_path))
            return target_path

        elif self.backend_type == "picamera_legacy":
            from picamera import PiCamera
            with PiCamera() as camera:
                camera.resolution = (1920, 1080)
                camera.capture(str(target_path))
            return target_path

        elif self.backend_type == "opencv":
            import cv2
            ret, frame = self.cap.read()
            if ret:
                cv2.imwrite(str(target_path), frame)
                return target_path

        # Mock synthetic image fallback with license plate simulation
        from io import BytesIO
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (640, 360), color=(30, 35, 45))
            draw = ImageDraw.Draw(img)
            draw.rectangle([0, 180, 640, 360], fill=(55, 60, 70))
            draw.rectangle([220, 150, 420, 280], fill=(40, 90, 160), outline=(20, 50, 100), width=3)
            # Simulated plate
            draw.rectangle([280, 240, 370, 270], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
            draw.text((290, 250), "HP 65 A 1084", fill=(0, 0, 0))
            img.save(target_path, format="JPEG", quality=80)
        except Exception:
            # Minimal dummy JPEG header fallback if PIL not installed on Pi
            with open(target_path, "wb") as f:
                f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00")
        return target_path


# ---------------------------------------------------------------------------
# Telemetry Uploader Functions
# ---------------------------------------------------------------------------

def post_telemetry_summary(backend_url: str, device_id: str, road_name: str,
                           posted_limit: float, speeds: list, window_start: str, window_end: str):
    """
    Sends aggregated traffic speed summary to backend.
    """
    url = f"{backend_url.rstrip('/')}/api/v1/telemetry/summary"
    avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else 0.0

    payload = {
        "device_id": device_id,
        "road_name": road_name,
        "posted_speed_limit": posted_limit,
        "window_start": window_start,
        "window_end": window_end,
        "raw_vehicle_count": len(speeds),
        "speed_array": speeds,
        "avg_speed": avg_speed,
        "vehicle_count": len(speeds),
        "timestamp": window_end,
    }

    try:
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            print(f"[✔ Summary Sent] Count: {len(speeds)} | Avg Speed: {avg_speed} km/h")
        else:
            print(f"[✘ Summary Failed] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[✘ Summary Network Error] {e}")


def post_speed_breach(backend_url: str, device_id: str, road_name: str,
                      posted_limit: float, speed: float, image_path: Path, timestamp: str):
    """
    Sends an overspeed violation event along with camera snapshot to backend.
    Backend runs YOLOv8 vehicle detection + license plate ALPR on this snapshot.
    """
    url = f"{backend_url.rstrip('/')}/api/v1/telemetry/breach"
    b64_img = None

    if image_path and image_path.exists() and image_path.stat().st_size > 0:
        try:
            with open(image_path, "rb") as f:
                b64_img = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            print(f"[Camera Warning] Failed to read image for base64: {e}")

    payload = {
        "device_id": device_id,
        "road_name": road_name,
        "posted_limit_kmh": posted_limit,
        "speed_kmh": speed,
        "speed": speed,
        "timestamp": timestamp,
        "image_base64": b64_img,
    }

    try:
        res = requests.post(url, json=payload, timeout=12)
        if res.status_code == 200:
            data = res.json().get("data", {})
            plate = data.get("license_plate", "UNKNOWN")
            vtype = data.get("vehicle_type", "Vehicle")
            conf = data.get("ocr_confidence", 0.0)
            print(f"[🚨 Breach Uploaded] Speed: {speed:.1f} km/h (Limit: {posted_limit}) -> Backend Detected: [{plate}] ({vtype}, OCR Conf: {conf*100:.1f}%)")
        else:
            print(f"[✘ Breach Failed] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[✘ Breach Network Error] {e}")


# ---------------------------------------------------------------------------
# Main Daemon Loop
# ---------------------------------------------------------------------------

def run_telemetry_daemon(args):
    print("=" * 70)
    print(" RoadSentinel Raspberry Pi Telemetry Client (Zero-AI Edge Mode)")
    print("=" * 70)
    print(f" Target Backend URL   : {args.backend}")
    print(f" Node Identifier      : {args.device_id}")
    print(f" Monitored Road       : {args.road_name}")
    print(f" Posted Speed Limit   : {args.limit} km/h")
    print(f" Overspeed Threshold  : {args.threshold} km/h")
    print(f" Radar Poll Interval  : {args.poll} s")
    print(f" Summary Aggregation  : {args.summary_interval} s")
    print("=" * 70)

    radar = RadarSensorAdapter(args.radar_port)
    camera = CameraAdapter()

    speeds_in_window = []
    window_start_dt = datetime.now(timezone.utc)

    try:
        while True:
            speed = radar.read_speed()
            now_dt = datetime.now(timezone.utc)
            now_iso = now_dt.isoformat()

            if speed > 0:
                speeds_in_window.append(speed)
                print(f"[Radar Detection] Speed: {speed:.1f} km/h")

                # Check for Overspeed Breach
                if speed >= args.threshold:
                    print(f"[!] OVERSPEED DETECTED: {speed:.1f} km/h >= {args.threshold} km/h limit! Capturing evidence snapshot...")
                    img_name = f"breach_{int(time.time())}_{args.device_id}.jpg"
                    img_path = camera.capture(img_name)

                    # Dispatch upload asynchronously to not block the radar loop
                    threading.Thread(
                        target=post_speed_breach,
                        args=(args.backend, args.device_id, args.road_name,
                              args.limit, speed, img_path, now_iso),
                        daemon=True
                    ).start()

            # Check if summary window elapsed
            elapsed = (now_dt - window_start_dt).total_seconds()
            if elapsed >= args.summary_interval:
                window_end_iso = now_iso
                window_start_iso = window_start_dt.isoformat()
                captured_speeds = list(speeds_in_window)
                speeds_in_window.clear()
                window_start_dt = now_dt

                if captured_speeds:
                    threading.Thread(
                        target=post_telemetry_summary,
                        args=(args.backend, args.device_id, args.road_name,
                              args.limit, captured_speeds, window_start_iso, window_end_iso),
                        daemon=True
                    ).start()

            time.sleep(args.poll)

    except KeyboardInterrupt:
        print("\n[Shutdown] Pi Telemetry Client terminated gracefully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Raspberry Pi Edge Telemetry Streamer for RoadSentinel")
    parser.add_argument("--backend", default=DEFAULT_BACKEND_URL, help="FastAPI backend host URL (e.g. http://192.168.1.50:8000)")
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID, help="Node ID (e.g. RPI4_NORTH_GATE)")
    parser.add_argument("--road-name", default=DEFAULT_ROAD_NAME, help="Campus road name")
    parser.add_argument("--limit", type=float, default=DEFAULT_POSTED_LIMIT, help="Posted speed limit in km/h")
    parser.add_argument("--threshold", type=float, default=DEFAULT_OVERSPEED_THRESHOLD, help="Overspeed trigger threshold in km/h")
    parser.add_argument("--poll", type=float, default=DEFAULT_POLL_INTERVAL, help="Radar sampling interval in seconds")
    parser.add_argument("--summary-interval", type=int, default=DEFAULT_SUMMARY_INTERVAL, help="Summary push interval in seconds")
    parser.add_argument("--radar-port", default=None, help="Serial port for radar hardware (e.g. /dev/ttyUSB0)")

    args = parser.parse_args()
    run_telemetry_daemon(args)
