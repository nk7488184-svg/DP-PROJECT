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
# Realistic Indian license plates (Prioritizing Mandi / Himachal Pradesh)
# ───────────────────────────────────────────────────────────────────────
_PLATE_POOL = [
    "HP 33 B 4921", "HP 65 A 1084", "HP 28 T 3319", "HP 31 E 8840",
    "HP 33 C 8841", "HP 65 B 3390", "HP 33 F 5120", "HP 65 A 9912",
    "HP 01 BG 7733", "HP 02 A 5567", "HP 34 C 1209", "HP 73 A 5562",
    "HP 12 F 6617", "HP 04 K 2205", "HP 10 D 1148", "HP 28 J 4407",
    "HP 34 A 1121", "HP 39 B 5583", "HP 66 C 2247", "HP 45 D 7790",
    "HP 22 E 3314", "HP 51 F 8862", "HP 77 G 4406", "HP 68 H 1139",
    "HP 33 A 1234", "HP 65 C 5678", "HP 31 D 9012", "HP 28 B 3456",
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
        draw.text((12, 8), "RPi-4 CAMERA SENSING UNIT 01 | RADAR SPEED ENFORCEMENT", fill=(200, 210, 225))
        
        draw.rectangle([0, h - 28, w, h], fill=(15, 18, 24))
        draw.text((12, h - 20), f"TIMESTAMP: {timestamp_str[:19].replace('T', ' ')} IST", fill=(200, 210, 225))
        draw.text((360, h - 20), f"RADAR SPEED: {speed:.1f} km/h (LIMIT {limit:.0f})", fill=(255, 75, 75))

        img.save(disk_path, format="JPEG", quality=82)
    except Exception as e:
        print(f"[Evidence Gen Warning] Could not save {disk_path}: {e}")

_VEHICLE_TYPES = [
    ("Car",        1.0,  0.65),
    ("Bike",       0.5,  0.25),
    ("Bus",        3.0,  0.10),
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
            "RPI4_CAMERA_UNIT_01": {
                "device_id": "RPI4_CAMERA_UNIT_01",
                "name": "Edge Roadside Sensing Unit (24GHz Doppler Radar)",
                "location": "Behind A11 on New Construction Road",
                "posted_limit": 20.0,
                "status": "online",
                "last_seen": "Active (24GHz Doppler Radar Live)",
                "offline_since": None,
                "offline_reason": None,
                "field_test_active_window": "Continuous Live Sensing (Operational)",
                "firmware": "v2.4-c++17-radar",
                "radar_model": "HLK-LD2415H 24GHz",
                "camera_model": "Zero-Storage Camera Bypass",
                "network": "Wi-Fi / 4G LTE",
            }
        }
        self._seed_nov11_full_day()

    # ──────────────────────────────────────────────────────────────────
    # FIELD TEST SYNTHETIC SEED: November 11 2026, 15:00 IST → 21:00 IST (3 PM - 9 PM)
    # 72 five-minute windows for the single camera sensing node
    # Server goes offline at 23:14 IST (11:14 PM)
    # ──────────────────────────────────────────────────────────────────
    def _seed_nov11_full_day(self):
        """
        Generates synthetic dataset for the November 11, 2026 Field Test (3:00 PM - 9:00 PM IST)
        from a single Raspberry Pi 4 edge sensing unit (HLK-LD2415H 24 GHz
        Doppler radar) stationed Behind A11 on New Construction Road.
        """
        IST = timezone(timedelta(hours=5, minutes=30))
        # Start of day: Nov 11 2026 00:00 IST
        day_start = datetime(2026, 11, 11, 0, 0, 0, tzinfo=IST)

        NODES = [
            {
                "device_id": "RPI4_CAMERA_UNIT_01",
                "road_name": "Behind A11 on New Construction Road",
                "posted_limit": 20.0,
                "lat": 31.7807,
                "lng": 76.9967,
                "base_factor": 1.0,
            }
        ]

        breach_counter = 1000

        # ── Generate 72 five-minute windows (15:00 IST / 3 PM → 21:00 IST / 9 PM) ──
        # win_idx 180 corresponds to 15:00 (3 PM), win_idx 251 corresponds to 20:55-21:00 (9 PM)
        for win_idx in range(180, 252):
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

                # Mean speed: Hilly terrain (IIT Mandi, Kamand) with 20 km/h limit.
                # Average speeds stay around 14-19 km/h. Vehicles rarely exceed 42-45 km/h.
                if is_peak and base_count > 18:
                    mean_speed = 14.8 + _det_gauss(seed_base + "_sp", 0, 1.0)
                elif total_min < 360:
                    mean_speed = 18.2 + _det_gauss(seed_base + "_sp", 0, 1.4)
                else:
                    mean_speed = 16.5 + _det_gauss(seed_base + "_sp", 0, 1.2)

                mean_speed = max(8.0, min(22.0, mean_speed))
                std_dev = abs(_det_gauss(seed_base + "_sd", 3.8, 0.8))
                std_dev = max(1.5, min(std_dev, 6.0))

                # Generate individual speed samples with strict hilly constraints:
                # Normal traffic: 12-22 km/h
                # Occasional overspeeders: 24-42 km/h
                # Hard limit: strictly capped <= 45.0 km/h (never above 45 usually, strictly no one > 50)
                speeds = []
                for vi in range(vehicle_count):
                    s = _det_gauss(f"{seed_base}_v{vi}", mean_speed, std_dev)
                    # ~3% occasional reckless speeder in hilly stretch (e.g. going 28 - 44 km/h)
                    r_speed = _det_hash(f"{seed_base}_reck{vi}")
                    if r_speed < 0.025:
                        s = 33.0 + _det_hash(f"{seed_base}_fast{vi}") * 11.5  # 33.0 to 44.5 km/h
                    elif r_speed < 0.08:
                        s = 23.0 + _det_hash(f"{seed_base}_med{vi}") * 8.0    # 23.0 to 31.0 km/h

                    s = max(6.0, round(s, 1))
                    if s > 45.0:
                        s = 43.0 + round(_det_hash(f"{seed_base}_cap{vi}") * 1.8, 1)  # max 44.8 km/h
                    speeds.append(s)

                speeds.sort()
                avg_speed = round(sum(speeds) / len(speeds), 1)
                v85 = round(speeds[int(len(speeds) * 0.85)] if len(speeds) > 1 else speeds[0], 1)
                v50 = round(speeds[len(speeds) // 2], 1)
                sp_std = round(std_dev, 2)
                max_sp = round(max(speeds), 1)
                min_sp = round(min(speeds), 1)

                overspeed = sum(1 for s in speeds if s > limit)
                extreme = sum(1 for s in speeds if s > limit + 20)
                viol_pct = round(overspeed / max(1, vehicle_count) * 100.0, 1)

                approaching = int(round(vehicle_count * (0.50 + _det_hash(seed_base + "_dir") * 0.10)))
                receding = max(0, vehicle_count - approaching)

                ci = round(avg_speed / limit, 2)
                occ = round(min(90.0, vehicle_count * 1.6 + _det_gauss(seed_base + "_occ", 0, 2)), 1)
                occ = max(1.0, occ)

                if ci < 0.5:
                    cong = "Heavy Congestion"
                elif ci < 0.75:
                    cong = "Moderate"
                else:
                    cong = "Free Flow"

                fine_supp = ci < 0.35
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

                # ── Breach events for vehicles exceeding 20 km/h limit ──
                for vi, sp in enumerate(speeds):
                    if sp <= limit:
                        continue
                    delta = round(sp - limit, 1)
                    # Hilly road violation captures across 6-hour field test (~20-25 total breaches):
                    #   delta < 3.0 (20-22.9 km/h) → radar tolerance, ignored
                    #   delta 3.0-7.0 (23-26.9 km/h) → capture ~12 %
                    #   delta 7.0-14.0 (27-33.9 km/h) → capture ~35 %
                    #   delta >= 14.0 (34-44.8 km/h) → capture ~70 %
                    if delta < 3.0:
                        continue
                    elif delta < 7.0 and _det_hash(f"{seed_base}_br{vi}") > 0.12:
                        continue
                    elif delta < 14.0 and _det_hash(f"{seed_base}_br{vi}") > 0.35:
                        continue
                    elif _det_hash(f"{seed_base}_fastbr{vi}") > 0.70:
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

                    # Severity on a 20 km/h hill road:
                    if delta > 16:      # >= 36.1 km/h (nearly 2x limit)
                        severity = "critical"
                    elif delta > 10:    # 30.1 - 36.0 km/h
                        severity = "high"
                    elif delta > 5:     # 25.1 - 30.0 km/h
                        severity = "moderate"
                    else:               # 23.0 - 25.0 km/h
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

        # Node status set to offline after 11 PM (at 23:14 IST)
        # Operational period was 15:00 - 21:00 (3 PM - 9 PM) on Nov 11, 2026
        offline_ts = datetime(2026, 11, 11, 23, 14, 0, tzinfo=IST).isoformat()
        for nid in self.nodes:
            self.nodes[nid]["status"] = "offline"
            self.nodes[nid]["last_seen"] = offline_ts
            self.nodes[nid]["offline_since"] = offline_ts
            self.nodes[nid]["offline_reason"] = "Camera Module 3 CSI bus disconnected & server went offline at 11:14 PM IST on Nov 11, 2026"
            self.nodes[nid]["field_test_active_window"] = "Nov 11, 2026, 3:00 PM – 9:00 PM IST (Operational)"

        # ── Export structured JSON dataset to file for easy viewing & inspection ──
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            storage_json = os.path.join(base_dir, "storage", "synthetic_field_test_nov11.json")
            root_json = os.path.join(os.path.dirname(base_dir), "synthetic_field_test_2026-11-11.json")
            os.makedirs(os.path.join(base_dir, "storage"), exist_ok=True)

            export_data = {
                "metadata": {
                    "test_date": "2026-11-11",
                    "operational_window": "3:00 PM – 9:00 PM IST (15:00 – 21:00)",
                    "server_offline_at": "2026-11-11T23:14:00+05:30 (11:14 PM IST)",
                    "node_status": "OFFLINE (CSI bus disconnected after 11 PM)",
                    "offline_reason": "Camera Module 3 CSI bus disconnected & server went offline at 11:14 PM IST",
                    "location": "IIT Mandi Kamand Campus (Campus Test Corridor)",
                    "posted_speed_limit_kmh": 20.0,
                    "max_speed_observed_kmh": max((b.speed_kmh for b in self.breaches), default=44.8),
                    "total_telemetry_windows": len(self.telemetry_history),
                    "total_vehicles_observed": sum(t.vehicle_count for t in self.telemetry_history),
                    "total_speed_breaches": len(self.breaches),
                    "active_learning_samples_queued": len(self.active_learning_queue),
                    "radar_model": "HLK-LD2415H 24GHz Doppler Radar",
                    "camera_sensor": "Raspberry Pi Camera Module 3 (1080p)",
                    "evidence_photos_directory": "storage/evidence/"
                },
                "nodes": self.nodes,
                "breaches": [b.model_dump() for b in self.breaches],
                "telemetry_history": [t.model_dump() for t in self.telemetry_history]
            }

            with open(storage_json, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2)

            with open(root_json, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2)

            print(f"[Seed Export] Saved full synthetic dataset to:\n  - {storage_json}\n  - {root_json}")
        except Exception as e:
            print(f"[Seed Export Notice] {e}")

        print(f"[Seed] Hilly 20 km/h field test data loaded: "
              f"{len(self.telemetry_history)} telemetry windows (15:00-21:00 IST), "
              f"{len(self.breaches)} breach events (max {max((b.speed_kmh for b in self.breaches), default=0):.1f} km/h), "
              f"{len(self.active_learning_queue)} active-learning samples; node offline at 23:14 IST.")

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
