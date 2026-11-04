"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Activity,
  Gauge,
  Radio,
  Car,
  ShieldCheck,
  TrendingUp,
  MapPin,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react";
import { fetchFromFastApi } from "@/lib/api";

interface ProcessedTelemetry {
  vehicle_count: number;
  flow_rate_vph: number;
  approaching_count: number;
  receding_count: number;
  average_speed_kmh: number;
  speed_85th_percentile: number;
  median_speed_kmh: number;
  speed_std_dev: number;
  max_speed_kmh: number;
  min_speed_kmh: number;
  posted_limit_kmh: number;
  overspeed_count: number;
  violation_rate_percentage: number;
  extreme_overspeed_count: number;
  congestion_status: string;
  radar_occupancy_pct: number;
  congestion_index: number;
  fine_suppression_active: boolean;
  device_id: string;
  road_name: string;
  window_start: string;
  window_end: string;
  calculated_at: string;
}

export default function PublicTrafficPage() {
  const [selectedNode, setSelectedNode] = useState("RPI4_NORTH_GATE");
  const [telemetry, setTelemetry] = useState<ProcessedTelemetry | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fallbackData: ProcessedTelemetry = {
    vehicle_count: 22,
    flow_rate_vph: 264.0,
    approaching_count: 14,
    receding_count: 8,
    average_speed_kmh: 28.5,
    speed_85th_percentile: 32.4,
    median_speed_kmh: 27.8,
    speed_std_dev: 4.8,
    max_speed_kmh: 41.2,
    min_speed_kmh: 15.0,
    posted_limit_kmh: 30.0,
    overspeed_count: 3,
    violation_rate_percentage: 13.6,
    extreme_overspeed_count: 0,
    congestion_status: "Free Flow",
    radar_occupancy_pct: 18.2,
    congestion_index: 0.95,
    fine_suppression_active: false,
    device_id: "RPI4_NORTH_GATE",
    road_name: "North Campus Main Gate Road",
    window_start: new Date(Date.now() - 300000).toISOString(),
    window_end: new Date().toISOString(),
    calculated_at: new Date().toISOString(),
  };

  const loadData = async () => {
    try {
      const statsRes = await fetchFromFastApi("/api/v1/telemetry/stats");
      if (statsRes?.data) setStats(statsRes.data);

      const nodesRes = await fetchFromFastApi("/api/v1/telemetry/nodes");
      if (nodesRes?.data) setNodes(nodesRes.data);

      const latestRes = await fetchFromFastApi(`/api/v1/telemetry/latest?device_id=${selectedNode}`);
      if (latestRes?.data) {
        setTelemetry(latestRes.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      if (!telemetry) {
        setTelemetry(fallbackData);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 6000);
    return () => clearInterval(timer);
  }, [selectedNode]);

  const active = telemetry || fallbackData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Free Flow":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Moderate":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Heavy Congestion":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Gridlock":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-gray-50/60 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Live Campus Road Telemetry
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground">IIT Mandi Traffic & Safety Monitor</h1>
              <p className="text-sm text-muted mt-1">
                Real-time Doppler radar traffic telemetry and flow analytics powered by roadside Raspberry Pi sensing nodes.
              </p>
            </div>

            {/* Road Location Selector */}
            <div className="flex items-center gap-3">
              <select
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.target.value)}
                className="bg-white border border-border rounded-xl px-4 py-2 text-sm font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="RPI4_NORTH_GATE">North Campus Main Gate Road</option>
                <option value="RPI4_SOUTH_ACADEMIC">South Campus Academic Complex</option>
                <option value="RPI4_HOSTEL_ROAD">Chandra Taal Hostel Road</option>
              </select>

              <button
                onClick={loadData}
                title="Refresh feed"
                className="p-2 bg-white border border-border rounded-xl text-muted hover:text-foreground hover:bg-gray-100 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Road Condition Banner */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-primary flex-shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{active.road_name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(active.congestion_status)}`}>
                    {active.congestion_status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>IIT Mandi Campus | Posted Limit: <b>{active.posted_limit_kmh} km/h</b></span>
                  <span>•</span>
                  <span>Last Updated: {lastUpdated || "Live"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
              <div>
                <p className="text-xs text-muted">Projected Traffic</p>
                <p className="text-2xl font-extrabold text-foreground">{active.flow_rate_vph} <span className="text-xs font-normal text-muted">VPH</span></p>
              </div>
              <div>
                <p className="text-xs text-muted">85th Percentile Speed</p>
                <p className="text-2xl font-extrabold text-primary">{active.speed_85th_percentile} <span className="text-xs font-normal text-muted">km/h</span></p>
              </div>
            </div>
          </div>

          {/* Analytics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Traffic Flow & Volume */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">1. Traffic Volume & Flow</span>
                <Car className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Vehicle Passes in Window</span>
                  <span className="font-bold text-foreground">{active.vehicle_count}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Approaching Vehicles</span>
                  <span className="font-semibold text-emerald-600">↑ {active.approaching_count}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Receding Vehicles</span>
                  <span className="font-semibold text-blue-600">↓ {active.receding_count}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted">Projected Hourly Flow</span>
                  <span className="font-mono font-bold text-primary">{active.flow_rate_vph} VPH</span>
                </div>
              </div>
            </div>

            {/* Card 2: Velocity & Speed Engineering Profile */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">2. Velocity & Speed Profile</span>
                <Gauge className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Mean Operating Speed (V̄)</span>
                  <span className="font-mono font-bold text-foreground">{active.average_speed_kmh} km/h</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">85th Percentile Speed (V85)</span>
                  <span className="font-mono font-bold text-primary">{active.speed_85th_percentile} km/h</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Median Speed (V50 Baseline)</span>
                  <span className="font-mono font-semibold text-foreground">{active.median_speed_kmh} km/h</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted">Speed Variance (Std Dev σ)</span>
                  <span className="font-mono font-semibold text-muted">{active.speed_std_dev} km/h</span>
                </div>
              </div>
            </div>

            {/* Card 3: Road Safety & Compliance */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">3. Safety Compliance</span>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Violation Rate</span>
                  <span className="font-bold text-red-600">{active.violation_rate_percentage}%</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Vehicles Over Limit</span>
                  <span className="font-semibold text-foreground">{active.overspeed_count} passes</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/60 text-sm">
                  <span className="text-muted">Severe Overspeed (&gt;30 km/h)</span>
                  <span className="font-semibold text-red-500">{active.extreme_overspeed_count}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted">Safety Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Enforced via Radar
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Educational / Technology Explainer */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-6">
            <h3 className="font-bold text-emerald-950 text-sm mb-2">How Edge-Assisted Radar Analytics Works</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Our campus roadside units run a lightweight C++ Zero-AI State Machine on Raspberry Pi 4 hardware,
              reading 24GHz Doppler radar reflections at 9600 baud. As vehicles pass, speed vectors and timestamps are captured in RAM (&lt;35MB memory footprint)
              and streamed periodically to our FastAPI cloud server. The backend computes civil engineering speed percentiles (V85) and Greenshields congestion curves
              to keep IIT Mandi campus roads safe and congestion-free.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
