import os
import re
import base64
import uuid
import json
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional
from app.models import SpeedBreachPayload, ProcessedBreachRecord, ActiveLearningSample

# Directories
EVIDENCE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "evidence")
ACTIVE_LEARNING_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "active_learning")

os.makedirs(EVIDENCE_DIR, exist_ok=True)
os.makedirs(ACTIVE_LEARNING_DIR, exist_ok=True)

# Passenger Car Equivalent (PCE) Weightings
PCE_WEIGHTS = {
    "Car": 1.0,
    "SUV": 1.2,
    "Motorcycle": 0.5,
    "Bus": 3.0,
    "Truck": 3.0,
    "Van": 1.5,
}

# Simulated Indian / Himachal Pradesh plate formats for campus validation
SAMPLE_PLATES = [
    "HP 33 B 4921",
    "HP 65 A 1084",
    "DL 8C AK 9012",
    "CH 01 BG 7733",
    "HP 28 T 3319",
    "HR 26 DQ 5521",
    "HP 31 E 8840",
]

def save_base64_image(base64_str: str, device_id: str, breach_id: str) -> Optional[str]:
    """
    Decodes 1080p JPEG from RAM buffer directly to structured NVMe storage.
    Path: storage/evidence/{device_id}/{YYYY-MM-DD}/{breach_id}.jpg
    """
    try:
        # Strip header if present e.g. "data:image/jpeg;base64,"
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]

        image_bytes = base64.b64decode(base64_str)
        date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        target_dir = os.path.join(EVIDENCE_DIR, device_id, date_folder)
        os.makedirs(target_dir, exist_ok=True)

        filename = f"{breach_id}.jpg"
        file_path = os.path.join(target_dir, filename)

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        # Return relative URL for web viewing
        return f"/evidence/{device_id}/{date_folder}/{filename}"
    except Exception as e:
        print(f"[Evidence Storage Error] {e}")
        return None

_anpr_pipeline = None

def get_anpr():
    global _anpr_pipeline
    if _anpr_pipeline is None:
        try:
            import sys
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if base_dir not in sys.path:
                sys.path.insert(0, base_dir)
            from pipeline import ANPRPipeline
            _anpr_pipeline = ANPRPipeline(use_ocr=True)
            print("[ML Pipeline] YOLOv8 Vehicle & Plate ANPR Pipeline initialized successfully.")
        except Exception as e:
            print(f"[ML Pipeline ANPR Notice] {e}")
            _anpr_pipeline = False
    return _anpr_pipeline if _anpr_pipeline is not False else None


def format_indian_plate(raw_text: str) -> str:
    """Cleans and standardizes Indian HSRP license plate format e.g. HP33B4921 -> HP 33 B 4921."""
    import re
    cleaned = re.sub(r"[^A-Z0-9]", "", raw_text.upper())
    # Format Standard e.g. HP 33 B 4921 or DL 8C AM 4901
    m1 = re.match(r"^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$", cleaned)
    if m1:
        return f"{m1.group(1)} {m1.group(2)} {m1.group(3)} {m1.group(4)}"
    # Format e.g. HP 33 4921
    m2 = re.match(r"^([A-Z]{2})(\d{1,2})(\d{3,4})$", cleaned)
    if m2:
        return f"{m2.group(1)} {m2.group(2)} {m2.group(3)}"
    return cleaned


def run_ml_inference(payload: SpeedBreachPayload, image_path: Optional[str]) -> Tuple[str, float, str, float]:
    """
    Executes YOLOv8 Vehicle Classification + ALPR (License Plate OCR) pipeline using car_det_API models.
    Operates on actual captured camera image from RAM.
    Returns: (vehicle_type, pce_weight, license_plate, ocr_confidence)
    """
    anpr = get_anpr()
    if anpr and image_path:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rel = image_path.lstrip("/\\")

        # Resolve disk path correctly in storage/evidence
        candidates = [
            os.path.join(base_dir, "storage", rel),
            os.path.join(base_dir, rel),
            os.path.join(EVIDENCE_DIR, rel.replace("evidence/", "").replace("evidence\\", "")),
        ]
        disk_path = None
        for c in candidates:
            if os.path.exists(c):
                disk_path = c
                break

        if disk_path and os.path.exists(disk_path):
            try:
                from PIL import Image
                import numpy as np
                import re

                img = Image.open(disk_path).convert("RGB")
                res = anpr.analyze(img)
                vehicles = res.get("vehicles", [])
                unassigned = res.get("unassigned_plates", [])

                # 1. Check if YOLOv8 plate detector found a plate on a vehicle
                for v in vehicles:
                    plate_obj = v.get("plate")
                    if plate_obj and plate_obj.get("text") and len(plate_obj.get("text", "").strip()) >= 3:
                        formatted = format_indian_plate(plate_obj["text"])
                        v_cls = v.get("class", "Car").capitalize()
                        if v_cls == "Truck":
                            v_cls = "Bus"
                        return v_cls, v.get("pce", 1.0), formatted, float(plate_obj.get("ocr_confidence", 0.92))

                # 2. Check unassigned detected plates (plate visible without whole car bounding box)
                for u in unassigned:
                    if u.get("text") and len(u.get("text", "").strip()) >= 3:
                        v_type = vehicles[0].get("class", "Car").capitalize() if vehicles else "Car"
                        if v_type == "Truck":
                            v_type = "Bus"
                        formatted = format_indian_plate(u["text"])
                        return v_type, 1.0, formatted, float(u.get("ocr_confidence", 0.88))

                # 3. Direct Full-Frame & Crop EasyOCR fallback (essential when camera is close or angles are steep)
                if anpr.reader is not None:
                    ocr_results = anpr.reader.readtext(np.array(img.convert("L")), detail=1)
                    best_match = None
                    best_conf = 0.0

                    for box, text, conf in ocr_results:
                        clean = re.sub(r"[^A-Z0-9]", "", text.upper())
                        # Check if looks like plate text (at least 4 chars)
                        if len(clean) >= 4 and float(conf) > best_conf:
                            best_match = clean
                            best_conf = float(conf)

                    if best_match and best_conf > 0.30:
                        v_type = vehicles[0].get("class", "Car").capitalize() if vehicles else "Car"
                        if v_type == "Truck":
                            v_type = "Bus"
                        formatted = format_indian_plate(best_match)
                        return v_type, 1.0, formatted, round(best_conf, 4)

                # 4. If vehicle detected but plate could not be read
                if vehicles:
                    v_type = vehicles[0].get("class", "Car").capitalize()
                    if v_type == "Truck":
                        v_type = "Bus"
                    pce = vehicles[0].get("pce", 1.0)
                    return v_type, pce, "PLATE_UNREADABLE", 0.40

                # 5. Image processed, but no vehicle or plate text was detected
                return "Vehicle", 1.0, "NO_PLATE_DETECTED", 0.30

            except Exception as e:
                print(f"[ANPR Inference Warning] {e}")

    # If the edge node already specified a license plate
    if payload.license_plate:
        v_type = payload.vehicle_type or ("Motorcycle" if payload.speed_kmh > 35 else "Car")
        pce = PCE_WEIGHTS.get(v_type, 1.0)
        confidence = 0.96
        return v_type, pce, payload.license_plate, confidence

    # If no image was provided at all (camera offline or telemetry-only breach)
    v_type = payload.vehicle_type or "Vehicle"
    pce = PCE_WEIGHTS.get(v_type, 1.0)
    plate = payload.license_plate or "WAITING_ALPR"
    confidence = 0.0
    return v_type, pce, plate, confidence

def process_speed_breach(payload: SpeedBreachPayload) -> Tuple[ProcessedBreachRecord, Optional[ActiveLearningSample]]:
    """
    End-to-end speed breach processing:
    1. Generates unique breach identifier
    2. Decodes and archives 1080p snapshot
    3. Runs vehicle classification & license plate OCR
    4. Computes delta over posted limit & severity rating
    5. Flags low confidence predictions (< 75%) to Active Learning Queue
    """
    breach_id = f"BREACH-{uuid.uuid4().hex[:8].upper()}"
    timestamp = payload.timestamp or datetime.now(timezone.utc).isoformat()
    posted_limit = payload.posted_limit_kmh or 20.0
    delta = round(payload.speed_kmh - posted_limit, 1)

    # Calculate severity rating on 20 km/h hilly road:
    if delta >= 16.0:      # >= 36.1 km/h
        severity = "critical"
    elif delta >= 10.0:    # 30.1 - 36.0 km/h
        severity = "high"
    elif delta >= 5.0:     # 25.1 - 30.0 km/h
        severity = "moderate"
    else:                  # 20.1 - 25.0 km/h
        severity = "low"

    # Save evidence image
    image_url = None
    if payload.image_base64:
        image_url = save_base64_image(payload.image_base64, payload.device_id, breach_id)

    # ML Inference
    vehicle_type, pce_weight, plate, ocr_conf = run_ml_inference(payload, image_url)

    # Active Learning Pipeline check: Confidence < 75% triggers retraining queue
    routed_to_al = False
    al_sample: Optional[ActiveLearningSample] = None

    if ocr_conf < 0.75:
        routed_to_al = True
        al_sample = ActiveLearningSample(
            sample_id=f"AL-{uuid.uuid4().hex[:6].upper()}",
            timestamp=timestamp,
            device_id=payload.device_id,
            image_path=image_url or "no_image",
            predicted_plate=plate,
            confidence=ocr_conf,
            vehicle_type=vehicle_type,
            flag_reason=f"OCR Confidence ({int(ocr_conf*100)}%) fell below 75% enterprise threshold.",
        )
        # Store in active learning index file
        al_log_file = os.path.join(ACTIVE_LEARNING_DIR, "queue.jsonl")
        try:
            with open(al_log_file, "a") as f:
                f.write(json.dumps(al_sample.model_dump()) + "\n")
        except Exception as e:
            print(f"[Active Learning Queue Write Error] {e}")

    record = ProcessedBreachRecord(
        breach_id=breach_id,
        device_id=payload.device_id,
        timestamp=timestamp,
        speed_kmh=payload.speed_kmh,
        posted_limit_kmh=posted_limit,
        delta_over_limit=delta,
        severity=severity,
        vehicle_type=vehicle_type,
        pce_weight=pce_weight,
        license_plate=plate,
        ocr_confidence=ocr_conf,
        routed_to_active_learning=routed_to_al,
        image_url=image_url,
        fine_suppressed=False,
        road_name=payload.road_name or "Campus Road",
        latitude=payload.latitude or 31.7807,
        longitude=payload.longitude or 76.9967,
    )

    return record, al_sample
