# 🛣️ RoadSentinel — Campus Road Safety Monitoring Platform

A full-stack GIS-integrated road hazard reporting and monitoring platform built for **IIT Mandi Campus**. Citizens report road hazards (potholes, damaged pavement, poor lighting, etc.) via the public website, and administrators monitor, prioritize, and resolve them through a real-time dashboard — all rendered on a custom campus GIS map.

---

## 🌐 Live Online Demo (Run Directly on the Web)

You can run and test the complete application directly in your browser without installing anything on your computer:

## 📂 Project Structure

```
DP-PROJECT/
├── backend/                    # Express.js REST API (Node.js + TypeScript)
│   ├── src/
│   │   ├── server.ts           # Entry point
│   │   ├── config/             # Database config
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API routes
│   │   └── utils/             # Memory store, priority calculator, seed data
│   ├── public/gis/            # GIS GeoJSON data (campus maps)
│   └── package.json
│
├── campus-safety-dashboard/    # Admin Dashboard (Next.js + Tailwind)
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # Dashboard UI components
│   │   ├── lib/               # API client, mock data, utils
│   │   └── types/             # TypeScript type definitions
│   ├── public/gis/            # GIS data for map rendering
│   └── package.json
│
├── campus-safety-website/      # Public Website (Next.js + Tailwind)
│   ├── src/
│   │   ├── app/               # Pages: home, report, track, map
│   │   ├── components/        # UI components (map, forms, layout)
│   │   ├── lib/               # API client, mock data, utils
│   │   └── types/             # TypeScript type definitions
│   ├── public/gis/            # GIS data for map rendering
│   └── package.json
│
├── render.yaml                 # 1-click Render blueprint for backend deployment
└── README.md
```

---

## 💻 Local Development Setup

If you wish to run the project locally on your machine instead:

### Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **npm** v9+

### 1. Clone the Repository

```bash
git clone https://github.com/nk7488184-svg/DP-PROJECT.git
cd DP-PROJECT
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Admin Dashboard
cd ../campus-safety-dashboard
npm install

# Public Website
cd ../campus-safety-website
npm install
```

### 3. Configure Environment Variables

```bash
# Backend — create .env from the example
cd backend
cp .env.example .env
# Edit .env and set your MongoDB URI (optional — app works with in-memory store too)
```

```bash
# Dashboard — create .env.local
cd campus-safety-dashboard
echo NEXT_PUBLIC_API_URL=http://localhost:3001/api > .env.local
```

```bash
# Website — create .env.local
cd campus-safety-website
echo NEXT_PUBLIC_API_URL=http://localhost:3001/api > .env.local
```

### 4. Start All Three Servers

Open **3 terminal windows** and run:

```bash
# Terminal 1 — Backend API (port 3001)
cd backend
npm run dev

# Terminal 2 — Admin Dashboard (port 3000)
cd campus-safety-dashboard
npm run dev

# Terminal 3 — Public Website (port 3002)
cd campus-safety-website
npm run dev -- -p 3002
```

### 5. Open in Browser

| Service | Local URL |
|---------|-----------|
| **Public Website** | http://localhost:3002 |
| **Admin Dashboard** | http://localhost:3000/dashboard |
| **Backend API** | http://localhost:3001/api |

---

## ✨ Key Features

### Public Website (Port 3002)
- 🏠 **Landing Page** — Overview of the platform with live stats
- 📝 **Report Hazard** — Submit reports with GPS location, photo upload, severity selection
- 🗺️ **Campus GIS Map** — Interactive custom map (no external tiles) with buildings, roads, grounds
- 🔍 **Track Report** — Search by Report ID and track status with visual timeline
- 📍 **GPS Auto-Detection** — One-click location capture with "Use GPS" button

### Admin Dashboard (Port 3000)
- 📊 **Overview Dashboard** — Real-time KPI cards, trend charts, category breakdown
- 📋 **Reports Management** — Filterable table, detail modal, status updates (submitted → under review → in progress → resolved)
- 🗺️ **GIS Map View** — Custom campus map with hazard markers, layer controls, "Show on Map" from reports
- 🔔 **Notifications** — Live report alerts with time-ago labels
- 📈 **Analytics** — SLA compliance, monthly trends, hotspot analysis

### Campus GIS Map
- 🏛️ **142 Buildings** — Named (A-16, B9, STP, Chandra Taal Hostel, etc.)
- 🛣️ **Campus Roads** — Named road network from QGIS data
- 🚶 **Pedestrian Paths** — Dashed cyan walkways
- ⚽ **5 Sports Grounds** — Football, Cricket, Basketball, Volleyball, Lawn Tennis
- 🔴 **Campus Boundaries** — North & South campus perimeter
- 🎯 **No External Map Tiles** — Clean dark canvas with only IIT Mandi GIS data

### Backend API (Port 3001)
- `GET /api/reports` — List all hazard reports
- `POST /api/reports` — Submit a new report
- `PATCH /api/reports/:id/status` — Update report status
- `GET /api/dashboard/stats` — Dashboard statistics
- `POST /api/upload` — Image upload
- `GET /gis/campus_all_gis.json` — Serve GIS data

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| **Maps** | Leaflet + react-leaflet, Custom GeoJSON from QGIS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MongoDB (optional) / In-memory store (default) |
| **GIS Data** | QGIS → GeoPackage → GeoJSON (EPSG:32643 → WGS84) |

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
