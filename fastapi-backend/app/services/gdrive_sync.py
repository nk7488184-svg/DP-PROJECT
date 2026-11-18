"""
RoadSentinel - 2-Way Google Drive & Cloud Synchronization Service
Pulls offline violations and road segment speed analytics recorded in Google Drive / Google Sheets
when the laptop was powered off, and synchronizes them into local SQLite / Memory & Web Dashboards.
"""
import os
import json
import time
import requests
import threading
from datetime import datetime, timezone
from app.models import ProcessedBreachRecord, ProcessedTrafficAnalytics
from app.database import db

DRIVE_WEBHOOK_URL = os.environ.get(
    "DRIVE_WEBHOOK",
    "https://script.google.com/macros/s/AKfycbz9pMyATj3yq2YCz0oovQe1l5CUYV6KM_BVmWCb8ZzCPq2A9HRHAdK6lthgpO7Nywnw/exec"
)

def sync_from_gdrive() -> dict:
    """
    Pulls violations and road segment speed summaries from Google Drive/Sheets.
    Merges any missing records into local database.
    """
    if not DRIVE_WEBHOOK_URL:
        return {"success": False, "error": "No DRIVE_WEBHOOK configured"}

    try:
        res = requests.get(DRIVE_WEBHOOK_URL, timeout=12)
        if res.status_code != 200:
            return {"success": False, "status_code": res.status_code, "error": res.text[:200]}

        try:
            data = res.json()
        except Exception:
            return {"success": False, "error": "Google Web App returned non-JSON response"}

        if not data.get("success", False):
            return {"success": False, "error": data.get("error", "Unknown cloud error")}

        new_breaches_count = 0
        new_summaries_count = 0

        # 1. Sync Overspeed Violations
        violations = data.get("violations", [])
        for v in violations:
            ts = str(v.get("timestamp", ""))
            plate = str(v.get("license_plate", "UNKNOWN")).strip()
            speed = float(v.get("speed_kmh", 0.0))
            limit = float(v.get("posted_limit", 20.0))
            delta = float(v.get("delta_over_limit", max(0.0, speed - limit)))
            img_url = str(v.get("image_url", ""))
            dev_id = str(v.get("device_id", "RPI4_CAMERA_UNIT_01"))
            road = str(v.get("road_name", "Behind A11 on New Construction Road"))

            # Skip old synthetic dummy test plates
            if "HP 33 B 9999" in plate or "HP 33 B 4921" in plate:
                continue

            display_plate = "Reviewing ALPR" if ("WAITING_ALPR" in plate or not plate) else plate

            # Check if already in db.breaches
            already_exists = any(
                b.timestamp == ts or (abs(b.speed_kmh - speed) < 0.1 and b.timestamp[:16] == ts[:16])
                for b in db.breaches
            )
            if not already_exists:
                clean_plate_str = display_plate.replace(' ', '').replace('/', '')
                breach_id = f"GDRIVE-{int(time.time()*1000) % 100000}-{clean_plate_str}"
                severity = "Critical" if delta >= 15 else "Moderate" if delta >= 5 else "Minor"
                record = ProcessedBreachRecord(
                    breach_id=breach_id,
                    device_id=dev_id,
                    timestamp=ts,
                    speed_kmh=round(speed, 1),
                    posted_limit_kmh=round(limit, 1),
                    delta_over_limit=round(delta, 1),
                    severity=severity,
                    vehicle_type="Motorcycle" if speed > 35 else "Car",
                    pce_weight=1.0,
                    license_plate=display_plate,
                    ocr_confidence=0.88,
                    routed_to_active_learning=False,
                    image_url=img_url if (img_url and "No Image" not in img_url and len(img_url) > 10) else None,
                    fine_suppressed=False,
                    road_name=road,
                    latitude=31.7807,
                    longitude=76.9967
                )
                db.breaches.insert(0, record)
                db._save_persisted_breach(record)
                new_breaches_count += 1

        # 2. Sync Campus Road Segment Speeds
        segment_speeds = data.get("segment_speeds", [])
        for s in segment_speeds:
            ts = str(s.get("timestamp", ""))
            road = str(s.get("road_name", "Behind A11 on New Construction Road"))
            v_cnt = int(s.get("vehicle_count", 0))
            avg_sp = float(s.get("avg_speed", 0.0))
            v85 = float(s.get("v85_speed", avg_sp))
            max_sp = float(s.get("max_speed", avg_sp))
            limit = float(s.get("posted_limit", 20.0))
            over_cnt = int(s.get("overspeed_count", 0))
            dev_id = str(s.get("device_id", "RPI4_CAMERA_UNIT_01"))

            already_logged = any(
                th.window_end == ts and th.road_name == road
                for th in db.telemetry_history
            )
            if not already_logged and v_cnt > 0:
                analytics = ProcessedTrafficAnalytics(
                    vehicle_count=v_cnt,
                    flow_rate_vph=v_cnt * 60.0,
                    approaching_count=v_cnt,
                    receding_count=0,
                    average_speed_kmh=avg_sp,
                    speed_85th_percentile=v85,
                    median_speed_kmh=avg_sp,
                    speed_std_dev=2.0,
                    max_speed_kmh=max_sp,
                    min_speed_kmh=max(5.0, avg_sp - 3.0),
                    posted_limit_kmh=limit,
                    overspeed_count=over_cnt,
                    violation_rate_percentage=round((over_cnt / v_cnt) * 100.0, 1),
                    extreme_overspeed_count=0,
                    congestion_status="Free Flow",
                    radar_occupancy_pct=10.0,
                    congestion_index=round(avg_sp / max(1.0, limit), 2),
                    fine_suppression_active=False,
                    device_id=dev_id,
                    road_name=road,
                    window_start=ts,
                    window_end=ts,
                    window_duration_seconds=60.0,
                    is_peak_hour=False,
                    calculated_at=ts,
                    latitude=31.7807,
                    longitude=76.9967
                )
                db.add_telemetry(analytics)
                new_summaries_count += 1

        print(f"[Google Drive Sync] Synced {new_breaches_count} offline breaches, {new_summaries_count} road analytics records from Google Drive.")
        return {
            "success": True,
            "new_breaches_synced": new_breaches_count,
            "new_summaries_synced": new_summaries_count,
            "total_breaches_in_system": len(db.breaches),
            "total_summaries_in_system": len(db.telemetry_history)
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def start_periodic_drive_sync(interval_sec: int = 60):
    """Runs a non-blocking background thread that pulls from Google Drive every 60s."""
    def _loop():
        # Wait 3 seconds on startup before initial pull
        time.sleep(3.0)
        while True:
            try:
                sync_from_gdrive()
            except Exception:
                pass
            time.sleep(interval_sec)

    threading.Thread(target=_loop, daemon=True).start()
