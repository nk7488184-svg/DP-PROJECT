# 🛣️ RoadSentinel — Campus Road Safety & Traffic Analytics Platform

A comprehensive, full-stack GIS-integrated road hazard reporting and **Edge-Assisted Doppler Radar Traffic Analytics & Enforcement ecosystem** built for **IIT Mandi Campus**. 

The system pairs ultra-low-footprint edge sensing on roadside **Raspberry Pi 4 (2GB)** nodes (running a zero-AI C++ State Machine on 24GHz Doppler radar + Camera Module 3) with a high-throughput **FastAPI** analytics engine and real-time **Next.js** monitoring dashboards.

---

## 🌐 Live Application Links (Live Testing)

Test the complete application directly in your browser without setting up anything locally:

| Application | Description | Live Link | Status |
|-------------|-------------|-----------|--------|
| 🌐 **Public Website** | Report hazards, track status, view live campus traffic & GIS map | [`https://roadsentiweb.vercel.app`](https://roadsentiweb.vercel.app) | **Live & Operational** ✅ |
| 📊 **Admin Dashboard** | Review reports, radar telemetry, speed violations & active learning | [`https://roadsentidash.vercel.app/dashboard`](https://roadsentidash.vercel.app/dashboard) | **Live & Operational** ✅ |
| ⚡ **FastAPI Traffic Engine** | High-throughput radar telemetry ingestion & statistical analytics | `http://localhost:8000/docs` | **Online & Active** ✅ |
| ⚙️ **Backend REST API** | Live Express API serving reports and GIS GeoJSON data | [`https://road-sentinel-backend.onrender.com/api`](https://road-sentinel-backend.onrender.com/api) | **Online & Active** ✅ |

---

## 📂 Project Structure

```
DP-PROJECT/
├── fastapi-backend/            # High-throughput Python FastAPI Traffic Engine
│   ├── app/
│   │   ├── analytics.py        # 5-domain civil engineering & velocity formulas
│   │   ├── ml_pipeline.py      # YOLOv8 classification + ALPR + Active Learning Queue
│   │   ├── database.py         # Timeseries store & pre-seeded IIT Mandi nodes
│   │   ├── websocket_manager.py# Real-time WebSocket streaming (/ws/telemetry)
│   │   ├── models.py           # Pydantic schemas for telemetry & breach payloads
│   │   └── routes/telemetry.py # Ingestion endpoints (/summary, /breach, /stats)
│   ├── edge/
│   │   ├── edge_daemon.cpp     # C++17 Zero-AI Radar State Machine for Raspberry Pi 4
│   │   └── simulate_pi_edge.py # Live Raspberry Pi 4 edge simulation script
│   ├── storage/evidence/       # 1080p vehicle violation snapshots
│   ├── main.py                 # ASGI entry point (port 8000)
│   └── requirements.txt
│
├── backend/                    # Express.js REST API (Node.js + TypeScript - port 3001)
│   ├── src/                    # Hazards, GIS layers, user reporting
│   ├── public/gis/            # Campus GeoJSON boundaries, roads, buildings
│   └── package.json
│
├── campus-safety-dashboard/    # Admin Dashboard (Next.js 16 + Tailwind CSS)
│   ├── src/app/dashboard/
│   │   ├── traffic/           # 📡 Live Edge Radar Telemetry & ALPR Breaches
│   │   ├── reports/           # Hazard reports management
│   │   ├── map/               # Dark canvas IIT Mandi GIS map
│   │   └── analytics/         # Historical safety compliance
│   └── package.json
│
├── campus-safety-website/      # Public Website (Next.js 16 + Tailwind CSS)
│   ├── src/app/
│   │   ├── traffic/           # 🚗 Live Campus Traffic Conditions for Students & Faculty
│   │   ├── report/            # Hazard submission form with GPS pin
│   │   ├── track/             # Visual timeline report tracking
│   │   └── map/               # Custom IIT Mandi GIS map
│   └── package.json
│
├── render.yaml                 # 1-click Render blueprint for cloud backend
└── README.md
```

---

## 📡 Edge-Assisted Traffic Enforcement & Analytics Architecture

### 1. Ultra-Low Footprint Edge Sensing (Raspberry Pi 4 - 2GB RAM)
To eliminate heavy neural networks and memory fragmentation on roadside Pi nodes:
- **Zero-AI C++ Radar State Machine (`edge_daemon.cpp`)**:
  ```
  [ No Vehicle ]   ──>   [ Vehicle Enters Beam ]   ──>   [ Vehicle Exits Beam ]
   (Speed == 0)             (Speed > 5 km/h)                (Speed == 0)
     State: IDLE            State: TRACKING            Action: Count + 1
  ```
- Memory usage is capped **under 35 MB (<2% system load)**.
- Telemetry payloads are transmitted over 4G LTE cellular modems (via Tailscale CGNAT bypass) to FastAPI.

### 2. The 5 Core Analytical Categories Computed by FastAPI
When the Pi transmits periodic raw telemetry summaries, the backend computes:
1. **Traffic Volume & Flow Rate**:
   - `vehicle_count`: Total unique passes in summary window.
   - `flow_rate_vph`: Projected Vehicles-Per-Hour ($\text{Count} \times \frac{3600}{\Delta t}$).
   - `approaching_count` / `receding_count`: Directional split.
2. **Velocity & Speed Profile Analytics**:
   - `average_speed_kmh` ($V_{avg}$), Median speed ($V_{50}$), Max/Min speed.
   - `speed_85th_percentile` ($V_{85}$): Universal civil engineering metric to evaluate posted limits.
   - `speed_std_dev` ($\sigma$): Speed variance measuring dangerous weaving & dispersion.
3. **Safety Compliance & Violation Ratios**:
   - `overspeed_count`: Total speed limit violations.
   - `violation_rate_percentage`: $\frac{\text{Overspeed Count}}{\text{Total Count}} \times 100$.
   - `extreme_overspeed_count`: Reckless drivers exceeding limit by $>30\text{ km/h}$.
4. **Congestion & Road Density Index**:
   - `congestion_index`: Ratio $V_{avg} / V_{posted}$.
   - `congestion_status`: Free Flow ($\ge 0.85$), Moderate ($0.60 - 0.85$), Heavy Congestion ($0.40 - 0.60$), Gridlock ($< 0.40$).
   - `fine_suppression_active`: Automatic speed fine suppression during bumper-to-bumper traffic when index $< 0.40$.
5. **Temporal & Spatial Context**:
   - `window_start` / `window_end` (ISO-8601), `device_id`, `is_peak_hour` (morning/evening rush periods).

### 3. Server-Side ML & Active Learning Retraining Pipeline
When radar registers $V \ge V_{threshold}$:
- The Pi captures a 1080p JPEG into RAM and POSTs directly to `/api/v1/telemetry/breach`.
- FastAPI classifies vehicle type (Car, Bus, Truck, Motorcycle) and computes **Passenger Car Equivalent (PCE)** weighting.
- Runs License Plate OCR (ALPR).
- **Active Learning Queue**: If OCR confidence is $< 75\%$, the sample is automatically queued with a 20% anchor mix of historical data for background GPU fine-tuning, supporting zero-downtime weight hot-swapping in $<10\text{ ms}$.

---

## 🚀 Running the Project

### 1. Start FastAPI Traffic Engine (Port 8000)
```bash
cd fastapi-backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```
*Interactive Swagger API Docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### 2. Stream Live Raspberry Pi Telemetry (Simulator)
In a separate terminal, run the edge simulator to stream real-time radar data:
```bash
cd fastapi-backend/edge
python simulate_pi_edge.py
```
*Watch live radar state machine passes, flow rates, and speed breaches stream directly into the dashboard!*

### 3. Compile C++ Daemon on Physical Raspberry Pi 4
```bash
cd fastapi-backend/edge
g++ -std=c++17 -O3 edge_daemon.cpp -o edge_daemon -lcurl -lpthread
./edge_daemon
```

### 4. Start Admin Dashboard & Public Website
```bash
# Terminal A: Admin Dashboard (port 3000)
cd campus-safety-dashboard
npm run dev

# Terminal B: Public Website (port 3002)
cd campus-safety-website
npm run dev -- -p 3002

# Terminal C: Express Backend (port 3001)
cd backend
npm run dev
```

---

## 👥 Team

Built as part of the **Design Practicum (DP)** course project at **IIT Mandi**:
- Neeraj Kumar
- Devansh Yadav
- Shivansh Awasthi
- Shreyansh Jha
- Anil
- Pankaj
- Saffan

---

## 📄 License
This project is for academic purposes at IIT Mandi.
