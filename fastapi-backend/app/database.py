from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from app.models import ProcessedTrafficAnalytics, ProcessedBreachRecord, ActiveLearningSample
import json
import os
import math
import hashlib

# ───────────────────────────────────────────────────────────────────────
# Deterministic pseudo-random number generator (no random module needed;
# every restart produces identical "field-test" data for Nov 11 2026).
# ───────────────────────────────────────────────────────────────────────
def _det_hash(seed: str) -> float:
    """Return a deterministic float in [0, 1) from a string seed."""
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return (h % 1_000_000) / 1_000_000.0

def _det_gauss(seed: str, mu: float, sigma: float) -> float:
    """Box-Muller deterministic Gaussian from two hash values."""
    u1 = max(_det_hash(seed + "_u1"), 1e-9)
    u2 = _det_hash(seed + "_u2")
    z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    return mu + sigma * z

# ───────────────────────────────────────────────────────────────────────
# Realistic Indian license plates (HP / CH / DL / HR / PB / UK)
# ───────────────────────────────────────────────────────────────────────
_PLATE_POOL = [
    "HP 33 B 4921", "HP 65 A 1084", "HP 28 T 3319", "HP 31 E 8840",
    "HP 12 F 6617", "HP 04 K 2205", "HP 33 C 7712", "HP 65 B 3390",
    "HP 10 D 1148", "HP 73 A 5562", "HP 01 G 8834", "HP 28 J 4407",
    "DL 8C AK 9012", "DL 3C BM 4415", "DL 12 CQ 7829", "DL 9C AU 1133",
    "CH 01 BG 7733", "CH 04 AE 2281", "CH 01 CK 5590", "CH 03 BH 6678",
    "HR 26 DQ 5521", "HR 51 AJ 8804", "HR 06 BT 3316", "HR 36 CM 1190",
    "PB 11 EX 4427", "PB 65 BK 7761", "PB 08 DN 2253", "PB 10 CJ 8819",
    "UK 07 PA 4492", "UK 14 CB 6637", "UK 04 AB 1128", "UK 18 DG 9903",
    "HP 34 A 1121", "HP 39 B 5583", "HP 66 C 2247", "HP 45 D 7790",
    "HP 22 E 3314", "HP 51 F 8862", "HP 77 G 4406", "HP 68 H 1139",
]

_VEHICLE_COLORS = [
    (35, 40, 50),     # Midnight Black
    (220, 225, 230),  # Glacier White
    (160, 30, 35),    # Crimson Red
    (30, 75, 145),    # Navy Blue
    (140, 145, 155),  # Metallic Silver
    (210, 130, 25),   # Sunset Amber (Buses/Taxis)
]

def _generate_synthetic_evidence_image(disk_path: str, plate: str, speed: float,
                                       limit: float, vtype: str, timestamp_str: str,
                                       node_id: str, road_name: str):
    """Generates an authentic looking Raspberry Pi Camera Module 3 evidence snapshot."""
    if os.path.exists(disk_path):
        return
    try:
        from PIL import Image, ImageDraw
        os.makedirs(os.path.dirname(disk_path), exist_ok=True)
        w, h = 640, 360
        img = Image.new("RGB", (w, h), color=(30, 35, 45))
        draw = ImageDraw.Draw(img)

        # 1. Sky & Himalayan Mountain Background (Kamand valley context)
        draw.rectangle([0, 0, w, 140], fill=(40, 48, 62))
        draw.polygon([(0, 140), (120, 70), (280, 130), (450, 60), (640, 120), (640, 140), (0, 140)], fill=(30, 38, 48))
        draw.polygon([(60, 140), (220, 95), (380, 140), (520, 85), (640, 135), (640, 140), (60, 140)], fill=(24, 30, 40))

        # 2. Road surface with perspective
        draw.rectangle([0, 140, w, h], fill=(50, 55, 62))
        # Center lane dashed marking
        draw.line([320, 140, 320, h], fill=(235, 195, 40), width=3)
        # Shoulder white lines
        draw.line([60, 140, 20, h], fill=(220, 220, 220), width=2)
        draw.line([580, 140, 620, h], fill=(220, 220, 220), width=2)

        # 3. Vehicle body (color picked deterministically based on plate)
        h_val = int(hashlib.md5(plate.encode()).hexdigest(), 16)
        car_col = _VEHICLE_COLORS[h_val % len(_VEHICLE_COLORS)]

        if vtype in ["Bus", "Truck"]:
            draw.rectangle([190, 110, 450, 275], fill=car_col, outline=(15, 20, 30), width=3)
            draw.rectangle([210, 125, 430, 175], fill=(70, 90, 115))  # Windshield
            draw.rectangle([210, 245, 240, 265], fill=(240, 230, 150)) # Left light
            draw.rectangle([400, 245, 430, 265], fill=(240, 230, 150)) # Right light
            # HSRP Plate
            draw.rectangle([270, 240, 370, 268], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
            draw.rectangle([270, 240, 282, 268], fill=(30, 75, 180)) # Blue IND strip
            draw.text((290, 247), plate, fill=(0, 0, 0))
        elif vtype == "Motorcycle":
            draw.rectangle([290, 140, 350, 275], fill=car_col, outline=(15, 20, 30), width=2)
            draw.rectangle([305, 190, 335, 220], fill=(240, 230, 180)) # Headlight
            draw.rectangle([285, 245, 355, 270], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
            draw.text((292, 252), plate, fill=(0, 0, 0))
        else: # Car / SUV / Van
            draw.rectangle([210, 150, 430, 280], fill=car_col, outline=(15, 20, 30), width=3)
            draw.polygon([(230, 150), (260, 115), (380, 115), (410, 150)], fill=(75, 95, 125), outline=(15, 20, 30)) # Cabin
            draw.rectangle([220, 215, 255, 240], fill=(250, 240, 180)) # Left headlight
            draw.rectangle([385, 215, 420, 240], fill=(250, 240, 180)) # Right headlight
            # HSRP Plate
            draw.rectangle([265, 238, 375, 268], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
            draw.rectangle([265, 238, 278, 268], fill=(30, 75, 180)) # Blue IND strip
            draw.text((284, 247), plate, fill=(0, 0, 0))

        # 4. Telemetry OSD Header & Footer (as captured by RPi sensor edge node)
        draw.rectangle([0, 0, w, 28], fill=(15, 18, 24))
        draw.text((12, 8), f"RPi-4 RADAR [NODE: {node_id}] | ROAD: {road_name}", fill=(200, 210, 225))
        
        draw.rectangle([0, h - 28, w, h], fill=(15, 18, 24))
        draw.text((12, h - 20), f"TIMESTAMP: {timestamp_str[:19].replace('T', ' ')} IST", fill=(200, 210, 225))
        draw.text((360, h - 20), f"RADAR SPEED: {speed:.1f} km/h (LIMIT {limit:.0f})", fill=(255, 75, 75))

        img.save(disk_path, format="JPEG", quality=82)
    except Exception as e:
        print(f"[Evidence Gen Warning] Could not save {disk_path}: {e}")

_VEHICLE_TYPES = [
    ("Car",        1.0,  0.42),
    ("Motorcycle",  0.5,  0.28),
    ("SUV",        1.2,  0.12),
    ("Bus",        3.0,  0.06),
    ("Truck",      3.0,  0.05),
    ("Bicycle",    0.2,  0.04),
    ("Van",        1.5,  0.03),
]

def _pick_vehicle(seed: str):
    r = _det_hash(seed)
    cum = 0.0
    for vtype, pce, prob in _VEHICLE_TYPES:
        cum += prob
        if r < cum:
            return vtype, pce
    return "Car", 1.0


class TelemetryStore:
    def __init__(self):
        self.telemetry_history: List[ProcessedTrafficAnalytics] = []
        self.breaches: List[ProcessedBreachRecord] = []
        self.active_learning_queue: List[ActiveLearningSample] = []
        self.nodes: Dict[str, dict] = {
            "RPI4_NORTH_GATE": {
                "device_id": "RPI4_NORTH_GATE",
                "name": "North Campus Main Gate Sensor",
                "location": "North Campus Gate, IIT Mandi",
                "latitude": 31.7816,
                "longitude": 76.9972,
                "posted_limit": 30.0,
                "status": "online",
                "last_seen": "2026-11-11T18:25:00+05:30",
                "firmware": "v2.4-c++17-radar",
                "radar_model": "HLK-LD2415H 24GHz",
                "network": "4G LTE (Tailscale 100.84.12.5)",
            },
            "RPI4_SOUTH_ACADEMIC": {
                "device_id": "RPI4_SOUTH_ACADEMIC",
                "name": "South Campus Academic Block Road",
                "location": "Near A16 / Academic Complex",
                "latitude": 31.7754,
                "longitude": 76.9861,
                "posted_limit": 35.0,
                "status": "online",
                "last_seen": "2026-11-11T18:25:00+05:30",
                "firmware": "v2.4-c++17-radar",
                "radar_model": "HLK-LD2415H 24GHz",
                "network": "4G LTE (Tailscale 100.84.12.6)",
            },
            "RPI4_HOSTEL_ROAD": {
                "device_id": "RPI4_HOSTEL_ROAD",
                "name": "Chandra Taal Hostel Road",
                "location": "Hostel Zone Access Loop",
                "latitude": 31.7768,
                "longitude": 76.9882,
                "posted_limit": 25.0,
                "status": "online",
                "last_seen": "2026-11-11T18:25:00+05:30",
                "firmware": "v2.4-c++17-radar",
                "radar_model": "HLK-LD2415H 24GHz",
                "network": "4G LTE (Tailscale 100.84.12.7)",
            }
        }
        self._seed_nov11_full_day()

    # ──────────────────────────────────────────────────────────────────
    # FULL-DAY SYNTHETIC SEED: November 11 2026, 00:00 IST → 23:55 IST
    # 288 five-minute windows × 2 nodes = 576 telemetry records
    # ~28 speed breach events with realistic plate OCR
    # ──────────────────────────────────────────────────────────────────
    def _seed_nov11_full_day(self):
        """
        Generates a complete 24-hour synthetic dataset for November 11, 2026
        that mirrors realistic IIT Mandi campus traffic patterns recorded by
        two HLK-LD2415H 24 GHz Doppler radar + Pi Camera Module 3 nodes.

        Traffic profile (IST):
          00:00–05:59  Night      – very low traffic (2-6 vehicles / 5 min)
          06:00–07:59  Early AM   – gradual ramp-up
          08:00–10:30  Morning    – PEAK (classes, staff arrival)
          10:30–12:00  Late AM    – moderate
          12:00–14:00  Lunch      – secondary peak
          14:00–16:30  Afternoon  – moderate
          17:00–19:30  Evening    – PEAK (hostel return, dinner)
          19:30–21:00  Post-peak  – tapering
          21:00–23:59  Late night – low
        """
        IST = timezone(timedelta(hours=5, minutes=30))
        # Start of day: Nov 11 2026 00:00 IST
        day_start = datetime(2026, 11, 11, 0, 0, 0, tzinfo=IST)

        NODES = [
            {
                "device_id": "RPI4_NORTH_GATE",
                "road_name": "North Campus Main Gate Road",
                "posted_limit": 30.0,
                "lat": 31.7816,
                "lng": 76.9972,
                "base_factor": 1.0,   # traffic multiplier
            },
            {
                "device_id": "RPI4_SOUTH_ACADEMIC",
                "road_name": "South Campus Academic Complex Road",
                "posted_limit": 35.0,
                "lat": 31.7754,
                "lng": 76.9861,
                "base_factor": 1.25,
            },
        ]

        breach_counter = 1000

        # ── Generate 288 five-minute windows (00:00 → 23:55) ──
        for win_idx in range(288):
            w_start = day_start + timedelta(minutes=5 * win_idx)
            w_end = w_start + timedelta(minutes=5)
            ist_hour = w_start.hour
            ist_min = w_start.minute
            total_min = ist_hour * 60 + ist_min

            # ── Traffic volume curve (vehicles per 5-min window) ──
            if total_min < 360:                          # 00:00-05:59
                base_count = 3.0
            elif total_min < 480:                         # 06:00-07:59
                base_count = 3.0 + (total_min - 360) * 0.12  # ramp 3→17
            elif total_min < 630:                         # 08:00-10:29 PEAK
                base_count = 22.0 + 6.0 * math.sin((total_min - 480) / 150.0 * math.pi)
            elif total_min < 720:                         # 10:30-11:59
                base_count = 16.0
            elif total_min < 840:                         # 12:00-13:59 lunch
                base_count = 19.0 + 3.0 * math.sin((total_min - 720) / 120.0 * math.pi)
            elif total_min < 990:                         # 14:00-16:29
                base_count = 15.0
            elif total_min < 1020:                        # 16:30-16:59 ramp
                base_count = 15.0 + (total_min - 990) * 0.30
            elif total_min < 1170:                        # 17:00-19:29 PEAK
                base_count = 24.0 + 7.0 * math.sin((total_min - 1020) / 150.0 * math.pi)
            elif total_min < 1260:                        # 19:30-20:59
                base_count = 14.0 - (total_min - 1170) * 0.07
            else:                                         # 21:00-23:59
                base_count = 6.0 - (total_min - 1260) * 0.015

            base_count = max(base_count, 1.5)

            # Peak hour flag
            is_peak = (480 <= total_min <= 630) or (1020 <= total_min <= 1170)

            for node in NODES:
                seed_base = f"{node['device_id']}_{win_idx}"
                limit = node["posted_limit"]
                factor = node["base_factor"]

                # Jitter vehicle count
                vc_raw = base_count * factor + _det_gauss(seed_base + "_vc", 0, 2.0)
                vehicle_count = max(1, int(round(vc_raw)))

                # Mean speed: lower during congestion (peak), higher at night
                if is_peak and base_count > 18:
                    mean_speed = limit * 0.78 + _det_gauss(seed_base + "_sp", 0, 1.5)
                elif total_min < 360:
                    mean_speed = limit * 1.15 + _det_gauss(seed_base + "_sp", 0, 2.0)
                else:
                    mean_speed = limit * 0.92 + _det_gauss(seed_base + "_sp", 0, 2.5)

                mean_speed = max(8.0, mean_speed)
                std_dev = abs(_det_gauss(seed_base + "_sd", 5.0, 1.5))
                std_dev = max(1.5, min(std_dev, 12.0))

                # Generate individual speed samples
                speeds = []
                for vi in range(vehicle_count):
                    s = _det_gauss(f"{seed_base}_v{vi}", mean_speed, std_dev)
                    s = max(5.0, round(s, 1))
                    speeds.append(s)

                speeds.sort()
                avg_speed = round(sum(speeds) / len(speeds), 1)
                v85 = round(speeds[int(len(speeds) * 0.85)] if len(speeds) > 1 else speeds[0], 1)
                v50 = round(speeds[len(speeds) // 2], 1)
                sp_std = round(std_dev, 2)
                max_sp = round(max(speeds), 1)
                min_sp = round(min(speeds), 1)

                overspeed = sum(1 for s in speeds if s > limit)
                extreme = sum(1 for s in speeds if s > limit + 30)
                viol_pct = round(overspeed / max(1, vehicle_count) * 100.0, 1)

                approaching = int(round(vehicle_count * (0.50 + _det_hash(seed_base + "_dir") * 0.10)))
                receding = max(0, vehicle_count - approaching)

                ci = round(avg_speed / limit, 2)
                occ = round(min(95.0, vehicle_count * 1.8 + _det_gauss(seed_base + "_occ", 0, 3)), 1)
                occ = max(1.0, occ)

                if ci < 0.4:
                    cong = "Gridlock"
                elif ci < 0.6:
                    cong = "Heavy Congestion"
                elif ci < 0.85:
                    cong = "Moderate"
                else:
                    cong = "Free Flow"

                fine_supp = ci < 0.4
                flow_vph = round(vehicle_count * 12.0, 1)  # 5 min → 1 hour

                self.telemetry_history.append(
                    ProcessedTrafficAnalytics(
                        vehicle_count=vehicle_count,
                        flow_rate_vph=flow_vph,
                        approaching_count=approaching,
                        receding_count=receding,
                        average_speed_kmh=avg_speed,
                        speed_85th_percentile=v85,
                        median_speed_kmh=v50,
                        speed_std_dev=sp_std,
                        max_speed_kmh=max_sp,
                        min_speed_kmh=min_sp,
                        posted_limit_kmh=limit,
                        overspeed_count=overspeed,
                        violation_rate_percentage=viol_pct,
                        extreme_overspeed_count=extreme,
                        congestion_status=cong,
                        radar_occupancy_pct=occ,
                        congestion_index=ci,
                        fine_suppression_active=fine_supp,
                        device_id=node["device_id"],
                        road_name=node["road_name"],
                        window_start=w_start.isoformat(),
                        window_end=w_end.isoformat(),
                        window_duration_seconds=300.0,
                        is_peak_hour=is_peak,
                        calculated_at=w_end.isoformat(),
                        latitude=node["lat"],
                        longitude=node["lng"],
                    )
                )

                # ── Breach events for over-speed vehicles ──
                for vi, sp in enumerate(speeds):
                    if sp <= limit:
                        continue
                    delta = round(sp - limit, 1)
                    # Only capture significant overspeeds to keep ~30-45 breaches/day:
                    #   delta < 5  → skip entirely (radar tolerance margin)
                    #   delta 5-10 → capture ~6 % (borderline)
                    #   delta 10-18→ capture ~25 %
                    #   delta > 18 → capture 100 % (serious violation, always record)
                    if delta < 5:
                        continue
                    elif delta < 10 and _det_hash(f"{seed_base}_br{vi}") > 0.06:
                        continue
                    elif delta < 18 and _det_hash(f"{seed_base}_br{vi}") > 0.25:
                        continue

                    breach_counter += 1
                    bid = f"BREACH-{breach_counter:04d}"
                    breach_ts = w_start + timedelta(seconds=int(_det_hash(f"{seed_base}_bt{vi}") * 290))

                    vtype, pce = _pick_vehicle(f"{seed_base}_vt{vi}")
                    plate_idx = int(_det_hash(f"{seed_base}_pl{vi}") * len(_PLATE_POOL))
                    plate = _PLATE_POOL[plate_idx]

                    ocr_conf = round(0.60 + _det_hash(f"{seed_base}_oc{vi}") * 0.38, 2)
                    ocr_conf = min(ocr_conf, 0.99)
                    al_routed = ocr_conf < 0.75

                    if delta > 25:
                        severity = "critical"
                    elif delta > 15:
                        severity = "high"
                    elif delta > 8:
                        severity = "moderate"
                    else:
                        severity = "low"

                    # Generate real evidence snapshot image file on disk
                    rel_img = f"storage/evidence/{node['device_id']}/2026-11-11/{bid}.jpg"
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    abs_img = os.path.join(base_dir, rel_img)
                    _generate_synthetic_evidence_image(abs_img, plate, sp, limit, vtype, breach_ts.isoformat(), node['device_id'], node['road_name'])
                    img_url = f"/evidence/{node['device_id']}/2026-11-11/{bid}.jpg"

                    self.breaches.append(
                        ProcessedBreachRecord(
                            breach_id=bid,
                            device_id=node["device_id"],
                            timestamp=breach_ts.isoformat(),
                            speed_kmh=round(sp, 1),
                            posted_limit_kmh=limit,
                            delta_over_limit=delta,
                            severity=severity,
                            vehicle_type=vtype,
                            pce_weight=pce,
                            license_plate=plate,
                            ocr_confidence=ocr_conf,
                            routed_to_active_learning=al_routed,
                            image_url=img_url,
                            fine_suppressed=fine_supp,
                            road_name=node["road_name"],
                            latitude=node["lat"],
                            longitude=node["lng"],
                        )
                    )

                    if al_routed:
                        self.active_learning_queue.append(
                            ActiveLearningSample(
                                sample_id=f"AL-{breach_counter:04d}",
                                timestamp=breach_ts.isoformat(),
                                device_id=node["device_id"],
                                image_path=f"storage/evidence/{node['device_id']}/2026-11-11/{bid}.jpg",
                                predicted_plate=plate,
                                confidence=ocr_conf,
                                vehicle_type=vtype,
                                flag_reason=f"OCR confidence {ocr_conf*100:.0f}% < 75% threshold",
                            )
                        )

        # Sort breaches newest-first (dashboard expects this)
        self.breaches.sort(key=lambda b: b.timestamp, reverse=True)
        self.active_learning_queue.sort(key=lambda a: a.timestamp, reverse=True)

        # Update node last_seen to the final window
        final_ts = (day_start + timedelta(hours=23, minutes=55)).isoformat()
        for nid in self.nodes:
            self.nodes[nid]["last_seen"] = final_ts

        print(f"[Seed] Full-day synthetic data loaded: "
              f"{len(self.telemetry_history)} telemetry windows, "
              f"{len(self.breaches)} breach events, "
              f"{len(self.active_learning_queue)} active-learning samples "
              f"(Nov 11, 2026 00:00–23:55 IST)")

    def add_telemetry(self, item: ProcessedTrafficAnalytics):
        self.telemetry_history.append(item)
        if len(self.telemetry_history) > 1000:
            self.telemetry_history.pop(0)

        # Update node status
        if item.device_id in self.nodes:
            self.nodes[item.device_id]["last_seen"] = item.calculated_at
            self.nodes[item.device_id]["status"] = "online"
        else:
            self.nodes[item.device_id] = {
                "device_id": item.device_id,
                "name": f"Edge Sensor {item.device_id}",
                "location": item.road_name,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "posted_limit": item.posted_limit_kmh,
                "status": "online",
                "last_seen": item.calculated_at,
                "firmware": "v2.4-c++17-radar",
                "radar_model": "HLK-LD2415H 24GHz",
                "network": "4G LTE",
            }

    def add_breach(self, breach: ProcessedBreachRecord):
        self.breaches.insert(0, breach)
        if len(self.breaches) > 200:
            self.breaches.pop()

    def add_active_learning(self, sample: ActiveLearningSample):
        self.active_learning_queue.insert(0, sample)
        if len(self.active_learning_queue) > 100:
            self.active_learning_queue.pop()

    def get_latest_telemetry(self, device_id: Optional[str] = None) -> Optional[ProcessedTrafficAnalytics]:
        if not self.telemetry_history:
            return None
        if device_id:
            matches = [t for t in reversed(self.telemetry_history) if t.device_id == device_id]
            return matches[0] if matches else None
        return self.telemetry_history[-1]

    def get_history(self, device_id: Optional[str] = None, limit: int = 50) -> List[ProcessedTrafficAnalytics]:
        res = self.telemetry_history
        if device_id:
            res = [t for t in res if t.device_id == device_id]
        return list(reversed(res[-limit:]))

    def get_breaches(self, limit: int = 50) -> List[ProcessedBreachRecord]:
        return self.breaches[:limit]

    def get_summary_stats(self) -> dict:
        """Returns consolidated campus-wide KPI stats for UI cards."""
        latest = self.telemetry_history[-1] if self.telemetry_history else None
        total_vehicles_logged = sum(t.vehicle_count for t in self.telemetry_history[-20:])
        avg_speed_campus = round(sum(t.average_speed_kmh for t in self.telemetry_history[-10:]) / max(1, len(self.telemetry_history[-10:])), 1) if self.telemetry_history else 0.0
        
        # Overall compliance rate
        total_overspeed = sum(t.overspeed_count for t in self.telemetry_history[-20:])
        overall_violation_rate = round((total_overspeed / max(1, total_vehicles_logged)) * 100.0, 1)

        return {
            "active_nodes_count": len([n for n in self.nodes.values() if n.get("status") == "online"]),
            "total_nodes": len(self.nodes),
            "recent_vehicle_volume": total_vehicles_logged,
            "campus_avg_speed_kmh": avg_speed_campus,
            "campus_violation_rate": overall_violation_rate,
            "total_breaches_recorded": len(self.breaches),
            "active_learning_queued": len(self.active_learning_queue),
            "latest_congestion_status": latest.congestion_status if latest else "Free Flow",
            "current_flow_rate_vph": latest.flow_rate_vph if latest else 0.0,
            "v85_speed_kmh": latest.speed_85th_percentile if latest else 0.0,
        }

db = TelemetryStore()
