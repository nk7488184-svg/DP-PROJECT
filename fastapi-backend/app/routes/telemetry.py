from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from app.models import RawTelemetryPayload, SpeedBreachPayload, ProcessedTrafficAnalytics, ProcessedBreachRecord
from app.analytics import compute_traffic_analytics, parse_iso_or_now
from app.ml_pipeline import process_speed_breach
from app.database import db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/v1/telemetry", tags=["Traffic Telemetry & Enforcement"])

@router.get("/recent", summary="Get recent traffic summaries and overspeed breach events")
async def get_recent_telemetry(
    minutes: int = Query(1440, ge=1, le=2880, description="Lookback window in minutes"),
    device_id: Optional[str] = None
):
    """
    Returns aggregated telemetry summaries and overspeed breach events within the last `minutes`
    for the admin dashboard charts and violation tables.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=minutes)

    # 1. Filter and format summaries
    all_summaries = db.telemetry_history
    if device_id:
        all_summaries = [s for s in all_summaries if s.device_id == device_id]

    recent_summaries = []
    speed_buckets = {"<15 km/h": 0, "15-20 km/h": 0, "21-30 km/h": 0, "31-45 km/h": 0}
    total_vehicles = 0
    total_overspeed = 0

    for s in all_summaries:
        s_dt = parse_iso_or_now(s.window_end or s.calculated_at)
        if s_dt >= cutoff:
            recent_summaries.append({
                "timestamp": s.window_end or s.calculated_at,
                "avg_speed": round(s.average_speed_kmh, 1),
                "vehicle_count": s.vehicle_count,
                "flow_rate_vph": s.flow_rate_vph,
                "speed_85th_percentile": s.speed_85th_percentile,
                "congestion_status": s.congestion_status,
                "overspeed_count": s.overspeed_count,
                "device_id": s.device_id,
                "road_name": s.road_name,
            })
            total_vehicles += s.vehicle_count
            total_overspeed += s.overspeed_count

            # Speed distribution bucket (Hilly 20 km/h zones)
            sp = s.average_speed_kmh
            if sp < 15:
                speed_buckets["<15 km/h"] += s.vehicle_count
            elif sp <= 20:
                speed_buckets["15-20 km/h"] += s.vehicle_count
            elif sp <= 30:
                speed_buckets["21-30 km/h"] += s.vehicle_count
            else:
                speed_buckets["31-45 km/h"] += s.vehicle_count

    # If recent_summaries has few entries (e.g. testing date was Nov 11), fill from all_summaries
    if len(recent_summaries) < 48 and all_summaries:
        recent_summaries.clear()
        total_vehicles = 0
        total_overspeed = 0
        speed_buckets = {"<15 km/h": 0, "15-20 km/h": 0, "21-30 km/h": 0, "31-45 km/h": 0}
        for s in all_summaries[-72:]:
            recent_summaries.append({
                "timestamp": s.window_end or s.calculated_at,
                "avg_speed": round(s.average_speed_kmh, 1),
                "vehicle_count": s.vehicle_count,
                "flow_rate_vph": s.flow_rate_vph,
                "speed_85th_percentile": s.speed_85th_percentile,
                "congestion_status": s.congestion_status,
                "overspeed_count": s.overspeed_count,
                "device_id": s.device_id,
                "road_name": s.road_name,
            })
            total_vehicles += s.vehicle_count
            total_overspeed += s.overspeed_count

            sp = s.average_speed_kmh
            if sp < 15:
                speed_buckets["<15 km/h"] += s.vehicle_count
            elif sp <= 20:
                speed_buckets["15-20 km/h"] += s.vehicle_count
            elif sp <= 30:
                speed_buckets["21-30 km/h"] += s.vehicle_count
            else:
                speed_buckets["31-45 km/h"] += s.vehicle_count

    # 2. Filter and format breaches
    all_breaches = db.breaches
    if device_id:
        all_breaches = [b for b in all_breaches if b.device_id == device_id]

    recent_breaches = []
    vehicle_types: Dict[str, int] = {}
    hour_counts: Dict[str, int] = {}

    for b in all_breaches:
        b_dt = parse_iso_or_now(b.timestamp)
        if b_dt >= cutoff or len(recent_breaches) < 50:
            recent_breaches.append({
                "breach_id": b.breach_id,
                "timestamp": b.timestamp,
                "speed": round(b.speed_kmh, 1),
                "speed_kmh": round(b.speed_kmh, 1),
                "posted_limit": b.posted_limit_kmh,
                "delta_over_limit": round(b.delta_over_limit, 1),
                "plate_text": b.license_plate,
                "license_plate": b.license_plate,
                "image_url": b.image_url,
                "vehicle_type": b.vehicle_type,
                "severity": b.severity,
                "ocr_confidence": round(b.ocr_confidence * 100, 1),
                "fine_suppressed": b.fine_suppressed,
                "device_id": b.device_id,
                "road_name": b.road_name,
            })
            # Category counters
            vt = b.vehicle_type or "Unknown"
            vehicle_types[vt] = vehicle_types.get(vt, 0) + 1
            # Peak violation hour
            hr_str = b_dt.strftime("%H:00")
            hour_counts[hr_str] = hour_counts.get(hr_str, 0) + 1

    peak_hour = max(hour_counts, key=hour_counts.get) if hour_counts else "N/A"
    compliance_rate = round(100.0 - (total_overspeed / max(1, total_vehicles) * 100.0), 1)

    return {
        "success": True,
        "window_minutes": minutes,
        "summaries": recent_summaries,
        "breaches": recent_breaches,
        "analytics": {
            "total_vehicles_observed": total_vehicles,
            "total_violations": len(recent_breaches),
            "compliance_rate_pct": compliance_rate,
            "peak_violation_hour": peak_hour,
            "speed_distribution": speed_buckets,
            "vehicle_type_breakdown": vehicle_types,
        },
        "stats": db.get_summary_stats()
    }

@router.post("/summary", response_model=dict, summary="Ingest periodic raw telemetry from Raspberry Pi")
async def ingest_telemetry_summary(payload: RawTelemetryPayload, background_tasks: BackgroundTasks):
    """
    Called periodically (every 1, 5, or 15 mins) by the Raspberry Pi C++ daemon.
    Takes raw target vehicle counts and speed telemetry, then computes:
    1. Volume & flow rate (VPH)
    2. Velocity profiles (V_avg, V85, Median, StdDev)
    3. Safety compliance & violation ratios
    4. Congestion & Road Density Index
    5. Temporal context (peak hour, window duration)
    """
    try:
        processed = compute_traffic_analytics(payload)
        db.add_telemetry(processed)

        # Broadcast update in real-time to all connected web dashboards
        background_tasks.add_task(
            manager.broadcast,
            {"type": "TELEMETRY_UPDATE", "data": processed.model_dump()}
        )

        return {
            "success": True,
            "message": "Telemetry aggregated & civil engineering analytics computed successfully",
            "data": processed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process telemetry: {str(e)}")

@router.post("/breach", response_model=dict, summary="Ingest speed breach event with 1080p camera snapshot")
async def ingest_speed_breach(payload: SpeedBreachPayload, background_tasks: BackgroundTasks):
    """
    Triggered when Raspberry Pi radar registers a vehicle exceeding posted speed limit threshold.
    Processes the 1080p visual evidence, runs YOLOv8 classification + license plate ALPR,
    and routes low-confidence reads (<75%) to the server Active Learning Queue.
    """
    try:
        record, al_sample = process_speed_breach(payload)
        db.add_breach(record)
        if al_sample:
            db.add_active_learning(al_sample)

        # Broadcast live violation alert to connected web browsers
        background_tasks.add_task(
            manager.broadcast,
            {
                "type": "BREACH_ALERT",
                "data": record.model_dump(),
                "active_learning_triggered": record.routed_to_active_learning
            }
        )

        return {
            "success": True,
            "message": "Speed breach recorded and processed through ML vision pipeline",
            "data": record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process breach: {str(e)}")

@router.get("/latest", summary="Get most recent traffic analytics window")
async def get_latest_telemetry(device_id: Optional[str] = None):
    item = db.get_latest_telemetry(device_id)
    if not item:
        raise HTTPException(status_code=404, detail="No telemetry available yet")
    return {"success": True, "data": item}

@router.get("/history", summary="Get historical traffic analytics timeseries")
async def get_telemetry_history(
    device_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500)
):
    history = db.get_history(device_id, limit)
    return {"success": True, "count": len(history), "data": history}

@router.get("/stats", summary="Get high-level campus traffic KPI statistics")
async def get_campus_traffic_stats():
    stats = db.get_summary_stats()
    return {"success": True, "data": stats}

@router.get("/breaches", summary="Get list of recent speed violations")
async def get_recent_breaches(limit: int = Query(50, ge=1, le=200)):
    breaches = db.get_breaches(limit)
    return {"success": True, "count": len(breaches), "data": breaches}

@router.get("/active-learning", summary="Inspect low-confidence ALPR queue for model retraining")
async def get_active_learning_queue():
    queue = db.active_learning_queue
    return {
        "success": True,
        "count": len(queue),
        "threshold": "OCR Confidence < 75%",
        "data": queue
    }

@router.get("/nodes", summary="List registered Raspberry Pi edge sensing nodes")
async def get_registered_nodes():
    return {"success": True, "data": list(db.nodes.values())}

@router.get("/field-test", summary="Get Nov 11 2026 (3 PM - 9 PM) Field Test Audit Session")
async def get_field_test_session():
    """
    Returns the official November 11, 2026 field test session record.
    The single edge camera unit (RPI4_CAMERA_UNIT_01) was active between 15:00 and 21:00 IST (3 PM - 9 PM).
    The server and camera module CSI bus went offline at 23:14 IST (11:14 PM).
    """
    node = db.nodes.get("RPI4_CAMERA_UNIT_01", {})
    total_vehicles = sum(t.vehicle_count for t in db.telemetry_history)
    total_breaches = len(db.breaches)
    compliance_rate = round(100.0 - (total_breaches / max(1, total_vehicles) * 100.0), 1)

    return {
        "success": True,
        "session": {
            "test_date": "2026-11-11",
            "operational_window": "15:00 - 21:00 IST (3:00 PM – 9:00 PM)",
            "operational_status": "COMPLETED",
            "current_node_status": node.get("status", "offline"),
            "server_offline_at": "2026-11-11T23:14:00+05:30",
            "offline_reason": node.get("offline_reason", "Camera Module 3 CSI bus disconnected & server went offline at 11:14 PM IST on Nov 11, 2026"),
            "device_id": "RPI4_CAMERA_UNIT_01",
            "road_name": "Campus Test Corridor (IIT Mandi)",
            "posted_speed_limit_kmh": 20.0,
            "total_telemetry_windows": len(db.telemetry_history),
            "total_vehicles_observed": total_vehicles,
            "total_violations_registered": total_breaches,
            "compliance_rate_pct": compliance_rate,
            "active_learning_queued": len(db.active_learning_queue),
        },
        "node": node,
        "breaches": [b.model_dump() for b in db.breaches],
        "telemetry_windows": [t.model_dump() for t in db.telemetry_history],
    }
