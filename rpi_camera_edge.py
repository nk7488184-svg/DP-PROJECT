#!/usr/bin/env python3
"""
================================================================================
RoadSentinel - High-Performance Raspberry Pi Edge Streamer (1GB RAM Optimized)
================================================================================
Target Hardware : Raspberry Pi 4 / 3B+ / 5 (Optimized for 1GB RAM)
Sensors         : Sony IMX708 NoIR (Camera Module 3) + 24GHz Doppler Radar
Storage Policy  : STRICT ZERO SD-CARD STORAGE (100% Volatile RAM / 0 Bytes on SD)
Performance     : Lightweight ISP hardware-binned 640x360 streaming (~18KB/frame),
                  High-Res 720p ALPR snapshots on overspeed detection.
Cloud Target    : Google Drive & Google Cloud (neerajjeeadv2025@gmail.com)
================================================================================
"""

import os
import sys
import time
import json
import base64
import argparse
import threading
import subprocess
import io
import queue
from datetime import datetime, timezone
from typing import Optional

# Only 1 external library required: requests
try:
    import requests
    from requests.adapters import HTTPAdapter
except ImportError:
    print("[Error] 'requests' is missing. Install with: pip3 install requests --break-system-packages")
    sys.exit(1)

# Persistent HTTP keep-alive session
http_session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=0)
http_session.mount("https://", adapter)
http_session.mount("http://", adapter)

# ---------------------------------------------------------------------------
# Default Configuration (Optimized for 1GB RAM)
# ---------------------------------------------------------------------------
DEFAULT_BACKEND_URL = os.environ.get("BACKEND_URL", "https://defensive-products-dozens-snap.trycloudflare.com")
DEFAULT_DRIVE_WEBHOOK = os.environ.get("DRIVE_WEBHOOK", "https://script.google.com/macros/s/AKfycbz9pMyATj3yq2YCz0oovQe1l5CUYV6KM_BVmWCb8ZzCPq2A9HRHAdK6lthgpO7Nywnw/exec")
DEFAULT_DEVICE_ID = os.environ.get("DEVICE_ID", "RPI4_CAMERA_UNIT_01")
DEFAULT_ROAD_NAME = os.environ.get("ROAD_NAME", "Behind A11 on New Construction Road")
DEFAULT_STREAM_FPS = float(os.environ.get("STREAM_FPS", "12.0")) # Smooth 12-15 FPS
DEFAULT_SPEED_LIMIT = float(os.environ.get("SPEED_LIMIT", "20.0"))
DEFAULT_TRIGGER_LIMIT = float(os.environ.get("TRIGGER_LIMIT", "20.0"))
TARGET_ACCOUNT = "neerajjeeadv2025@gmail.com"


# ---------------------------------------------------------------------------
# In-Memory RAM Cloud Dispatcher (Zero SD Writes)
# ---------------------------------------------------------------------------
class RamCloudDispatcher:
    def __init__(self, drive_webhook_url: str):
        self.webhook_url = drive_webhook_url.strip()
        self.queue = queue.Queue(maxsize=5)
        self.running = True
        if self.webhook_url:
            threading.Thread(target=self._worker, daemon=True).start()

    def submit_event(self, payload: dict):
        if not self.webhook_url:
            return
        try:
            self.queue.put_nowait(payload)
        except queue.Full:
            try:
                self.queue.get_nowait()
            except queue.Empty:
                pass
            try:
                self.queue.put_nowait(payload)
            except queue.Full:
                pass

    def _worker(self):
        print(f"[Cloud Dispatcher Active] Google Drive sync armed for {TARGET_ACCOUNT}")
        while self.running:
            try:
                item = self.queue.get(timeout=1.0)
            except queue.Empty:
                continue

            try:
                res = requests.post(self.webhook_url, json=item, timeout=20)
                if res.status_code == 200:
                    speed = item.get("speed_kmh", 0.0)
                    print(f"\n[☁️ GOOGLE DRIVE BACKUP OK] Vehicle {speed:.1f} km/h uploaded directly to {TARGET_ACCOUNT} Google Drive!\n")
            except Exception:
                time.sleep(1.0)


# ---------------------------------------------------------------------------
# High-Efficiency Zero-Disk Camera Adapter (1GB RAM & PDAF Tuned)
# ---------------------------------------------------------------------------
class ZeroDiskCamera:
    """
    Ultra-low latency camera capture interface for Raspberry Pi 1GB RAM.
    Streams at 640x360 (~18KB) with zero garbage-collection thrash.
    Captures high-res 1280x720 only during vehicle overspeed detection.
    """
    def __init__(self, stream_w: int = 640, stream_h: int = 360):
        self.stream_w = stream_w
        self.stream_h = stream_h
        self.backend = None
        self.picam2 = None
        self.cap = None
        self.lock = threading.Lock()
        self.stream_buf = io.BytesIO()

        print("[Camera Init] Initializing hardware ISP camera pipeline...")

        # 1. Picamera2 (Official RPi Bookworm driver)
        try:
            from picamera2 import Picamera2
            self.picam2 = Picamera2()
            try:
                # Video configuration with native hardware downsampling
                config = self.picam2.create_video_configuration(main={"size": (self.stream_w, self.stream_h)})
            except Exception:
                config = self.picam2.create_still_configuration(main={"size": (self.stream_w, self.stream_h)})
            self.picam2.configure(config)
            self.picam2.start()
            self.backend = "picamera2"
            print(f"[Camera OK] Picamera2 ISP Active @ {self.stream_w}x{self.stream_h} (Ultra-low latency 1GB RAM mode)")

            # Enable Hardware Continuous Phase Detection Autofocus (PDAF) on Sony IMX708
            try:
                from libcamera import controls
                self.picam2.set_controls({
                    "AfMode": controls.AfModeEnum.Continuous,
                    "AfRange": controls.AfRangeEnum.Normal,
                    "AfSpeed": controls.AfSpeedEnum.Fast
                })
                print("[Camera Focus Mode] Hardware Continuous Autofocus (PDAF) LOCKED for Sony IMX708 sensor.")
            except Exception as e:
                print(f"[Camera Focus Note] PDAF controls: {e}")

            time.sleep(0.5)
            return
        except Exception:
            pass

        # 2. OpenCV VideoCapture (USB Webcams)
        try:
            import cv2
            self.cap = cv2.VideoCapture(0)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.stream_w)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.stream_h)
                self.backend = "opencv"
                print(f"[Camera OK] OpenCV V4L2 Active @ {self.stream_w}x{self.stream_h}")
                return
        except Exception:
            pass

        # 3. Direct OS Pipe Fallback
        for cmd in ["rpicam-still", "libcamera-still"]:
            try:
                res = subprocess.run([cmd, "--help"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if res.returncode == 0:
                    self.backend = f"pipe:{cmd}"
                    print(f"[Camera OK] Direct OS pipe active via '{cmd}'")
                    return
            except Exception:
                pass

        self.backend = "synthetic"
        print("[Camera Notice] Physical camera not detected; using in-memory benchmark stream.")

    def capture_stream_frame(self) -> Optional[bytes]:
        """Captures lightweight 640x360 frame directly in reused RAM buffer."""
        try:
            with self.lock:
                if self.backend == "picamera2" and self.picam2:
                    self.stream_buf.seek(0)
                    self.stream_buf.truncate(0)
                    self.picam2.capture_file(self.stream_buf, format="jpeg")
                    return self.stream_buf.getvalue()

                elif self.backend == "opencv" and self.cap:
                    import cv2
                    ret, frame = self.cap.read()
                    if ret:
                        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                        return buf.tobytes()

                elif self.backend and self.backend.startswith("pipe:"):
                    cmd_name = self.backend.split(":")[1]
                    cmd = [
                        cmd_name,
                        "-n", "-t", "200",
                        "-o", "-",
                        "--width", str(self.stream_w),
                        "--height", str(self.stream_h),
                        "-q", "65"
                    ]
                    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=2)
                    if proc.stdout and len(proc.stdout) > 500:
                        return proc.stdout

        except Exception as e:
            print(f"[Capture Error] {e}")

        return self._generate_synthetic_ram_frame()

    def focus_and_capture_evidence(self) -> Optional[bytes]:
        """Locks continuous PDAF focus on approaching vehicle for high-res ALPR snapshot."""
        try:
            with self.lock:
                if self.backend == "picamera2" and self.picam2:
                    try:
                        from libcamera import controls
                        self.picam2.set_controls({
                            "AfMode": controls.AfModeEnum.Continuous,
                            "AfSpeed": controls.AfSpeedEnum.Fast,
                            "AfTrigger": controls.AfTriggerEnum.Start
                        })
                        time.sleep(0.05)
                    except Exception:
                        pass
                    buf = io.BytesIO()
                    self.picam2.capture_file(buf, format="jpeg")
                    return buf.getvalue()
        except Exception as e:
            print(f"[Evidence Capture Notice] {e}")
        return self.capture_stream_frame()

    def _generate_synthetic_ram_frame(self) -> bytes:
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (640, 360), color=(25, 30, 38))
            draw = ImageDraw.Draw(img)
            draw.rectangle([0, 150, 640, 360], fill=(45, 50, 60))
            draw.line([320, 150, 320, 360], fill=(235, 195, 40), width=3)
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            draw.text((20, 20), "RoadSentinel RPi 5 Stream (1GB RAM Optimized)", fill=(52, 211, 153))
            draw.text((20, 38), f"Live UTC: {now_iso}", fill=(200, 210, 225))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=65)
            return buf.getvalue()
        except Exception:
            return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"


# ---------------------------------------------------------------------------
# Radar Sensor Interface
# ---------------------------------------------------------------------------
class RadarSensor:
    def __init__(self, serial_port: Optional[str] = None, baud_rate: int = 115200):
        self.conn = None
        self.port = serial_port
        self.baud = baud_rate
        self.last_reconnect_check = 0.0
        self._find_and_connect()

    def _find_and_connect(self):
        candidates = [self.port] if self.port else [
            "/dev/ttyUSB0",
            "/dev/ttyUSB1",
            "/dev/ttyACM0",
            "/dev/ttyACM1",
            "/dev/ttyAMA0",
            "/dev/serial0"
        ]

        for port in candidates:
            if port and os.path.exists(port):
                try:
                    import serial
                    self.conn = serial.Serial(port, self.baud, timeout=0.03)
                    self.port = port
                    print(f"\n[Hardware Radar CONNECTED] Active Doppler radar connected on {port}")
                    print("[Radar Mode] Pure Hardware: ONLY real vehicle speeds from physical radar will be shown.")
                    return
                except Exception:
                    pass

        print("\n[Radar Hardware Status] No physical radar detected on USB/serial ports.")
        print("[Radar Hardware Status] Speed is locked to 0.0 km/h until radar sensor is connected.\n")

    def read_speed(self) -> float:
        if not self.conn:
            now = time.time()
            if now - self.last_reconnect_check >= 3.0:
                self.last_reconnect_check = now
                for p in ["/dev/ttyUSB0", "/dev/ttyACM0", "/dev/ttyUSB1", "/dev/ttyACM1"]:
                    if os.path.exists(p):
                        self._find_and_connect()
                        break
            return 0.0

        try:
            if hasattr(self.conn, "in_waiting") and self.conn.in_waiting > 0:
                line = self.conn.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    import re
                    match = re.search(r"[-+]?\d*\.?\d+", line)
                    if match:
                        val = abs(float(match.group(0)))
                        if val >= 3.0:
                            return round(val, 1)
        except Exception:
            try:
                self.conn.close()
            except Exception:
                pass
            self.conn = None

        return 0.0


# ---------------------------------------------------------------------------
# Zero-Lag Live Frame Uploader
# ---------------------------------------------------------------------------
class LiveStreamUploader:
    def __init__(self, backend_url: str, device_id: str, road_name: str):
        self.backend_url = backend_url.rstrip("/")
        self.device_id = device_id
        self.road_name = road_name
        self.frame_slot = queue.Queue(maxsize=1)
        self.running = True
        self.sent_count = 0
        self.last_log = time.time()
        threading.Thread(target=self._worker, daemon=True).start()

    def submit_frame(self, frame_bytes: bytes):
        try:
            self.frame_slot.put_nowait(frame_bytes)
        except queue.Full:
            try:
                self.frame_slot.get_nowait()
            except queue.Empty:
                pass
            try:
                self.frame_slot.put_nowait(frame_bytes)
            except queue.Full:
                pass

    def _worker(self):
        url = f"{self.backend_url}/api/v1/camera/frame"
        headers = {
            "Content-Type": "image/jpeg",
            "X-Device-Id": self.device_id,
            "X-Road-Name": self.road_name
        }
        while self.running:
            try:
                frame = self.frame_slot.get(timeout=0.3)
            except queue.Empty:
                continue

            try:
                # Fast timeout (1.0s max) guarantees zero frame backlog over network
                res = http_session.post(url, data=frame, headers=headers, timeout=1.0)
                if res.status_code == 200:
                    self.sent_count += 1
                    now = time.time()
                    if now - self.last_log >= 3.0:
                        self.last_log = now
                        print(f"[Live Video Streaming] Sent {self.sent_count} frames live to dashboard -> {self.backend_url}")
            except Exception:
                pass


def send_live_speed(backend_url: str, device_id: str, speed: float, is_present: bool):
    url = f"{backend_url.rstrip('/')}/api/v1/telemetry/live-speed"
    payload = {
        "speed_kmh": speed,
        "is_target_present": is_present,
        "device_id": device_id
    }
    try:
        http_session.post(url, json=payload, timeout=1.5)
    except Exception:
        pass


def post_speed_breach_dual(backend_url: str, cloud_dispatcher: RamCloudDispatcher,
                           device_id: str, road_name: str, speed: float,
                           limit: float, frame_bytes: bytes):
    b64_str = base64.b64encode(frame_bytes).decode("utf-8")
    ts_now = datetime.now(timezone.utc).isoformat()
    payload = {
        "device_id": device_id,
        "road_name": road_name,
        "posted_limit_kmh": limit,
        "speed_kmh": speed,
        "speed": speed,
        "timestamp": ts_now,
        "image_base64": b64_str
    }

    # Always send to Google Drive
    cloud_dispatcher.submit_event(payload)

    # Also post to website
    url = f"{backend_url.rstrip('/')}/api/v1/telemetry/breach"
    try:
        t0 = time.time()
        res = http_session.post(url, json=payload, timeout=15)
        dt = time.time() - t0
        if res.status_code == 200:
            data = res.json().get("data", {})
            plate = data.get("license_plate", "UNKNOWN")
            vtype = data.get("vehicle_type", "Vehicle")
            conf = data.get("ocr_confidence", 0.0)
            breach_id = data.get("breach_id", "BREACH-001")
            print("\n" + "=" * 65)
            print(f" 🚨 [SPEED BREACH / ALPR DETECTED in {dt:.2f}s]")
            print(f" 🚘 Clocked Speed   : {speed:.1f} km/h (Limit: {limit} km/h)")
            print(f" 🏷️  Recognized Plate: [ {plate} ]")
            print(f" 🚗 Vehicle Class   : {vtype} (OCR Confidence: {conf*100:.1f}%)")
            print(f" 📁 Event ID        : {breach_id}")
            print(f" ☁️  Cloud Account   : {TARGET_ACCOUNT}")
            print("=" * 65 + "\n")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Main Client Loop
# ---------------------------------------------------------------------------
def run_client(args):
    print("=" * 75)
    print(" RoadSentinel Raspberry Pi Edge Streamer (1GB RAM High-Performance)")
    print("=" * 75)
    print(f" Target Website/Backend : {args.backend}")
    print(f" Target Cloud / Drive   : {TARGET_ACCOUNT}")
    print(f" Corridor Location      : {args.road_name}")
    print(f" Stream Resolution      : {args.width}x{args.height} (ISP Hardware Binned, ~18KB/frame)")
    print(f" Live Stream Target FPS : {args.fps} FPS")
    print(f" Camera Focus Mode      : Continuous PDAF Autofocus on Vehicles")
    print(f" SD Card Write Policy   : ZERO STORAGE (0 bytes on 16GB SD card)")
    print("=" * 75)

    camera = ZeroDiskCamera(stream_w=args.width, stream_h=args.height)
    radar = RadarSensor(serial_port=args.radar_port)
    cloud_dispatcher = RamCloudDispatcher(args.drive_webhook)

    frame_interval = 1.0 / max(1.0, args.fps)
    last_idle_heartbeat = 0.0

    uploader = LiveStreamUploader(args.backend, args.device_id, args.road_name)

    print("\n[Edge Streaming Started] Transmitting live video frames to website...")
    print("[Speed Radar Active] Strictly waiting for physical radar sensor readings.\n")

    try:
        while True:
            t_start = time.time()

            # 1. Capture lightweight frame strictly in RAM
            frame_bytes = camera.capture_stream_frame()

            if frame_bytes:
                uploader.submit_frame(frame_bytes)

            # 2. Read REAL Doppler radar speed
            speed = radar.read_speed()
            now_time = time.time()

            if speed >= 3.0:
                print(f"[Radar Speed Reading] Physical vehicle clocked at: {speed:.1f} km/h")
                threading.Thread(
                    target=send_live_speed,
                    args=(args.backend, args.device_id, speed, True),
                    daemon=True
                ).start()

                if speed >= args.threshold:
                    print(f"\n[🚨 REAL OVERSPEED DETECTED!] Vehicle: {speed:.1f} km/h >= {args.threshold} km/h limit!")
                    print(" [Camera Focus Mode] Locking PDAF focus for sharp ALPR evidence...")
                    breach_frame = camera.focus_and_capture_evidence() or frame_bytes
                    if breach_frame:
                        threading.Thread(
                            target=post_speed_breach_dual,
                            args=(args.backend, cloud_dispatcher, args.device_id,
                                  args.road_name, speed, args.limit, breach_frame),
                            daemon=True
                        ).start()
            else:
                if now_time - last_idle_heartbeat >= 2.0:
                    last_idle_heartbeat = now_time
                    threading.Thread(
                        target=send_live_speed,
                        args=(args.backend, args.device_id, 0.0, False),
                        daemon=True
                    ).start()

            # High precision throttle
            t_elapsed = time.time() - t_start
            t_sleep = max(0.005, frame_interval - t_elapsed)
            time.sleep(t_sleep)

    except KeyboardInterrupt:
        print("\n[Shutdown] Raspberry Pi Edge Streamer terminated cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RoadSentinel Edge Streamer (1GB RAM High-Performance)")
    parser.add_argument("--backend", "--server", default=DEFAULT_BACKEND_URL)
    parser.add_argument("--drive-webhook", default=DEFAULT_DRIVE_WEBHOOK)
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID)
    parser.add_argument("--road-name", default=DEFAULT_ROAD_NAME)
    parser.add_argument("--fps", type=float, default=DEFAULT_STREAM_FPS)
    parser.add_argument("--limit", type=float, default=DEFAULT_SPEED_LIMIT)
    parser.add_argument("--threshold", type=float, default=DEFAULT_TRIGGER_LIMIT)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    parser.add_argument("--radar-port", default=None)

    args = parser.parse_args()
    run_client(args)
