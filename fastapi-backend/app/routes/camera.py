from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import os
import sys
import time
import io
import base64
import uuid
import asyncio
import threading
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.routes.predict import get_classifier
from app.websocket_manager import manager
from app.database import db

router = APIRouter(prefix="/api/v1/camera", tags=["RPi Edge Camera & Road Vision"])

# Storage for hazard evidence captured by RPi camera (Saved on server NVMe/disk only, NEVER on RPi SD card)
HAZARDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "evidence", "hazards")
os.makedirs(HAZARDS_DIR, exist_ok=True)

class CameraStore:
    def __init__(self):
        self.lock = threading.Lock()
        self.latest_frame: Optional[bytes] = None
        self.last_updated: float = 0.0
        self.device_id: str = "RPI4_CAMERA_UNIT_01"
        self.road_name: str = "Behind A11 on New Construction Road"
        self.frame_count: int = 0
        self.fps: float = 0.0
        self.resolution: str = "1280x720"
        self.last_fps_calc_time: float = time.time()
        self.frames_since_last_calc: int = 0
        self.camera_backend: str = "picamera2" # or opencv, libcamera-pipe

    def update_frame(self, frame_bytes: bytes, device_id: Optional[str] = None, road_name: Optional[str] = None):
        with self.lock:
            self.latest_frame = frame_bytes
            now = time.time()
            self.last_updated = now
            self.frame_count += 1
            self.frames_since_last_calc += 1

            if device_id:
                self.device_id = device_id
            if road_name:
                self.road_name = road_name

            elapsed = now - self.last_fps_calc_time
            if elapsed >= 1.0:
                self.fps = round(self.frames_since_last_calc / elapsed, 1)
                self.frames_since_last_calc = 0
                self.last_fps_calc_time = now

    def get_latest_frame(self) -> bytes:
        with self.lock:
            if self.latest_frame:
                return self.latest_frame
        return self._generate_standby_frame()

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            now = time.time()
            last_seen = round(now - self.last_updated, 1) if self.last_updated > 0 else 999.0
            is_online = (last_seen < 8.0) and (self.frame_count > 0)
            return {
                "online": is_online,
                "device_id": self.device_id,
                "road_name": self.road_name,
                "fps": self.fps if is_online else 0.0,
                "frame_count": self.frame_count,
                "last_seen_seconds_ago": last_seen,
                "resolution": self.resolution,
                "storage_mode": "Zero-Storage (In-Memory Streaming)",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def _generate_standby_frame(self) -> bytes:
        """Dynamic placeholder frame when RPi camera stream is waiting or initializing."""
        w, h = 640, 360
        img = Image.new("RGB", (w, h), color=(18, 22, 28))
        draw = ImageDraw.Draw(img)

        # Subtle road perspective guidelines
        draw.rectangle([0, 150, w, h], fill=(28, 33, 42))
        draw.line([320, 150, 320, h], fill=(210, 180, 50), width=2)
        draw.line([80, 150, 30, h], fill=(120, 130, 145), width=1)
        draw.line([560, 150, 610, h], fill=(120, 130, 145), width=1)

        # Center banner
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        draw.rectangle([120, 100, 520, 210], fill=(24, 28, 36), outline=(50, 60, 75), width=2)
        draw.text((140, 115), "RoadSentinel RPi 5 Edge Camera Node", fill=(240, 240, 245))
        draw.text((140, 138), f"Location: {self.road_name}", fill=(160, 175, 200))
        draw.text((140, 160), "Status: Zero-Storage RAM Buffer Active", fill=(52, 211, 153))
        draw.text((140, 180), f"Clock: {now_str}", fill=(140, 145, 160))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

camera_store = CameraStore()

@router.post("/frame", summary="Ingest live camera frame from Raspberry Pi (RAM only)")
async def ingest_camera_frame(request: Request, background_tasks: BackgroundTasks):
    """
    Ingests an in-memory frame captured by the Raspberry Pi 5.
    Accepts:
    1. Direct raw JPEG binary stream (content-type: image/jpeg or application/octet-stream)
    2. Multipart form with field 'frame' or 'image'
    3. JSON body { 'image_base64': '...', 'device_id': '...', 'road_name': '...' }
    """
    try:
        content_type = request.headers.get("content-type", "").lower()
        frame_bytes: Optional[bytes] = None
        device_id = request.headers.get("x-device-id", "RPI4_CAMERA_UNIT_01")
        road_name = request.headers.get("x-road-name", "Behind A11 on New Construction Road")

        if "multipart/form-data" in content_type:
            form = await request.form()
            file_field = form.get("frame") or form.get("image") or form.get("file")
            if not file_field:
                raise HTTPException(status_code=400, detail="No frame attached in form")
            frame_bytes = await file_field.read()
            if "device_id" in form:
                device_id = str(form["device_id"])
            if "road_name" in form:
                road_name = str(form["road_name"])

        elif "application/json" in content_type:
            body = await request.json()
            b64_str = body.get("image_base64") or body.get("frame") or body.get("image")
            if not b64_str:
                raise HTTPException(status_code=400, detail="Missing image_base64 in JSON payload")
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            frame_bytes = base64.b64decode(b64_str)
            device_id = body.get("device_id", device_id)
            road_name = body.get("road_name", road_name)

        else:
            # Raw binary stream
            frame_bytes = await request.body()

        if not frame_bytes or len(frame_bytes) < 100:
            raise HTTPException(status_code=400, detail="Empty or corrupted frame received")

        # Update RAM frame store
        camera_store.update_frame(frame_bytes, device_id, road_name)

        # Notify connected dashboard clients via WebSocket (throttled every 5 frames)
        if camera_store.frame_count % 3 == 0:
            background_tasks.add_task(
                manager.broadcast,
                {
                    "type": "CAMERA_FRAME_TICK",
                    "device_id": camera_store.device_id,
                    "road_name": camera_store.road_name,
                    "fps": camera_store.fps,
                    "frame_count": camera_store.frame_count,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

        return {
            "success": True,
            "frame_count": camera_store.frame_count,
            "fps": camera_store.fps,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest camera frame: {str(e)}")


@router.get("/live", summary="Get latest live snapshot from camera as JPEG")
async def get_live_snapshot():
    """
    Returns the latest camera snapshot directly as an image/jpeg HTTP response.
    Can be used by <img> tags or periodic polling.
    """
    frame_bytes = camera_store.get_latest_frame()
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Device-Id": camera_store.device_id,
            "X-Road-Name": camera_store.road_name
        }
    )


@router.get("/stream", summary="Live MJPEG video stream from RPi 5 camera")
async def get_live_mjpeg_stream():
    """
    Returns a continuous MJPEG (Motion JPEG) stream.
    Display seamlessly in any browser with:
    <img src="http://localhost:8000/api/v1/camera/stream" />
    """
    async def frame_generator():
        while True:
            frame = camera_store.get_latest_frame()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(frame)).encode() + b"\r\n\r\n" +
                frame + b"\r\n"
            )
            # ~12 FPS stream rate
            await asyncio.sleep(0.08)

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/status", summary="Live edge camera operational telemetry")
async def get_camera_telemetry():
    """Returns connectivity, FPS, resolution, and edge node metadata."""
    return {
        "success": True,
        "data": camera_store.get_status()
    }


@router.post("/hazard-scan", summary="Run Road Hazard ML inference on camera capture")
async def analyze_hazard_from_camera(request: Request, background_tasks: BackgroundTasks):
    """
    Takes an image (either uploaded directly from RPi camera or uses current live RAM frame)
    and passes it to the PyTorch/ONNX EfficientNetV2-S Road Hazard Classifier.
    If a hazard is detected, saves image on server evidence store and broadcasts event.
    """
    try:
        clf = get_classifier()
        content_type = request.headers.get("content-type", "").lower()
        image_bytes: Optional[bytes] = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            f = form.get("image") or form.get("file")
            if f:
                image_bytes = await f.read()
        elif "application/json" in content_type:
            body = await request.json()
            b64_str = body.get("image_base64") or body.get("image")
            if b64_str:
                if "," in b64_str:
                    b64_str = b64_str.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_str)

        # Fallback to current live frame in memory if no image explicitly provided
        if not image_bytes:
            image_bytes = camera_store.get_latest_frame()

        # Run AI prediction
        prediction_result = clf.predict(image_bytes, top_k=3, filename="rpi_hazard_scan.jpg")

        top_pred = prediction_result.get("prediction", "Unknown")
        top_conf = prediction_result.get("confidence", 0.0)
        is_hazard = (top_pred not in ["Normal_Road", "Normal"]) and (top_conf >= 0.25)

        # Save evidence snapshot on server disk (NVMe/Laptop storage) if hazard verified
        image_url = None
        date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        scan_id = f"hazard_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        scan_filename = f"{scan_id}.jpg"
        target_dir = os.path.join(HAZARDS_DIR, date_folder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, scan_filename)

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        image_url = f"/evidence/hazards/{date_folder}/{scan_filename}"

        hazard_record = {
            "hazard_id": scan_id,
            "prediction": top_pred,
            "confidence": round(top_conf, 3),
            "top_predictions": prediction_result.get("top_predictions", []),
            "image_url": image_url,
            "device_id": camera_store.device_id,
            "road_name": camera_store.road_name,
            "coordinates": {"lat": 31.7816, "lng": 76.9945},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_hazard": is_hazard,
        }

        # Broadcast live hazard detection to UI
        background_tasks.add_task(
            manager.broadcast,
            {
                "type": "CAMERA_HAZARD_SCAN",
                "data": hazard_record
            }
        )

        if is_hazard:
            def _sync_to_web_reports(rec):
                try:
                    import urllib.request
                    import json
                    cat = rec.get("prediction", "Pothole_Surface_Breakout")
                    rep_payload = {
                        "title": f"{cat.replace('_', ' ')} detected via RPi Edge Camera",
                        "description": f"Automated AI detection from roadside unit {rec.get('device_id')}. Classified as {cat} with {round(rec.get('confidence', 0)*100, 1)}% confidence.",
                        "category": cat,
                        "severity": "critical" if "Pothole" in cat else "high" if any(k in cat for k in ["Crack", "Damage", "Iron"]) else "medium",
                        "location": {
                            "address": rec.get("road_name", "Behind A11 on New Construction Road"),
                            "coordinates": [76.9945, 31.7816]
                        },
                        "photos": [f"http://localhost:8000{rec.get('image_url')}"],
                        "status": "submitted"
                    }
                    data_bytes = json.dumps(rep_payload).encode("utf-8")
                    for p in [3001, 3000]:
                        try:
                            req = urllib.request.Request(
                                f"http://localhost:{p}/api/reports",
                                data=data_bytes,
                                headers={"Content-Type": "application/json", "x-sync-source": "rpi_camera"}
                            )
                            urllib.request.urlopen(req, timeout=3)
                        except Exception:
                            pass
                except Exception as e:
                    print(f"[Hazard Web Sync Note] {e}")

            background_tasks.add_task(_sync_to_web_reports, hazard_record)

        return {
            "success": True,
            "data": hazard_record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hazard scan failed: {str(e)}")
