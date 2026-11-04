"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Car,
  Clock,
  Gauge,
  MapPin,
  Radio,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { fetchFromFastApi, getFastApiWsUrl } from "@/lib/api";

interface BreachRecord {
  breach_id: string;
  device_id: string;
  timestamp: string;
  speed_kmh: number;
  posted_limit_kmh: number;
  delta_over_limit: number;
  severity: string;
  vehicle_type: string;
  pce_weight: number;
  license_plate: string;
  ocr_confidence: number;
  routed_to_active_learning: boolean;
  image_url?: string;
  fine_suppressed: boolean;
  road_name: string;
}

export default function OverspeedAlertsCard() {
  const [breaches, setBreaches] = useState<BreachRecord[]>([
    {
      breach_id: "BREACH-A801",
      device_id: "RPI4_SOUTH_ACADEMIC",
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      speed_kmh: 54.2,
      posted_limit_kmh: 35.0,
      delta_over_limit: 19.2,
      severity: "high",
      vehicle_type: "SUV",
      pce_weight: 1.2,
      license_plate: "HP 33 B 4921",
      ocr_confidence: 0.94,
      routed_to_active_learning: false,
      fine_suppressed: false,
      road_name: "South Campus Academic Complex Road",
    },
    {
      breach_id: "BREACH-C109",
      device_id: "RPI4_NORTH_GATE",
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      speed_kmh: 46.5,
      posted_limit_kmh: 30.0,
      delta_over_limit: 16.5,
      severity: "moderate",
      vehicle_type: "Car",
      pce_weight: 1.0,
      license_plate: "HP 65 A 1084",
      ocr_confidence: 0.88,
      routed_to_active_learning: false,
      fine_suppressed: false,
      road_name: "North Campus Main Gate Road",
    },
    {
      breach_id: "BREACH-E902",
      device_id: "RPI4_HOSTEL_ROAD",
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      speed_kmh: 42.0,
      posted_limit_kmh: 25.0,
      delta_over_limit: 17.0,
      severity: "high",
      vehicle_type: "Motorcycle",
      pce_weight: 0.5,
      license_plate: "DL 8C AK 9012",
      ocr_confidence: 0.91,
      routed_to_active_learning: false,
      fine_suppressed: false,
      road_name: "Chandra Taal Hostel Road",
    },
  ]);

  const [selectedBreach, setSelectedBreach] = useState<BreachRecord | null>(null);

  const loadBreaches = async () => {
    try {
      const res = await fetchFromFastApi("/api/v1/telemetry/breaches?limit=8");
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setBreaches(res.data);
      }
    } catch {
      // Keep initial realistic fallback
    }
  };

  useEffect(() => {
    loadBreaches();
    const interval = setInterval(loadBreaches, 6000);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(getFastApiWsUrl("/ws/telemetry"));
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "BREACH_ALERT" && msg.data) {
            setBreaches((prev) => [msg.data, ...prev.slice(0, 15)]);
          }
        } catch {}
      };
    } catch {}

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const formatTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Live Overspeeding Vehicle Watch</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold font-mono border border-red-500/20">
                RADAR + ALPR
              </span>
            </h3>
            <p className="text-xs text-muted">
              Automatic License Plate Recognition (ALPR) captured on 24GHz radar speed breaches
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/traffic"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold self-start sm:self-auto"
        >
          Open Radar Telemetry <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {breaches.slice(0, 3).map((b) => (
          <div
            key={b.breach_id}
            onClick={() => setSelectedBreach(b)}
            className="p-3.5 rounded-xl bg-sidebar/50 border border-border/80 hover:border-red-500/40 hover:bg-sidebar transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            {/* Top row: Severity & Timestamp */}
            <div className="flex items-center justify-between text-xs">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  b.severity === "critical"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : b.severity === "high"
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {b.severity} breach
              </span>
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(b.timestamp)}
              </span>
            </div>

            {/* Official Indian HSRP Style License Plate Display */}
            <div className="flex items-center justify-center my-1">
              <div className="inline-flex items-center bg-white text-zinc-900 border-2 border-zinc-800 rounded-md shadow-md overflow-hidden tracking-wider font-mono font-black text-sm px-2.5 py-1 select-all group-hover:scale-[1.02] transition-transform">
                <div className="flex flex-col items-center justify-center pr-1.5 mr-1.5 border-r border-zinc-400 text-[8px] leading-tight text-blue-700 font-bold">
                  <span>🇮🇳</span>
                  <span>IND</span>
                </div>
                <span className="text-base tracking-widest text-zinc-950 font-extrabold">
                  {b.license_plate}
                </span>
              </div>
            </div>

            {/* Speed & Location Info */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-muted block truncate max-w-[140px]">{b.road_name}</span>
                <span className="font-semibold text-foreground text-[11px]">{b.vehicle_type}</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-red-500 text-sm">
                  {b.speed_kmh} <span className="text-[10px] font-normal text-muted">km/h</span>
                </div>
                <div className="text-[10px] text-muted">
                  Limit: {b.posted_limit_kmh} (+{b.delta_over_limit})
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Snapshot / Detail Modal */}
      {selectedBreach && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sidebar border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-foreground text-sm">
                  Speed Breach Evidence: {selectedBreach.breach_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBreach(null)}
                className="text-muted hover:text-foreground text-xs px-2 py-1 rounded bg-card"
              >
                ✕ Close
              </button>
            </div>

            {/* License Plate Banner */}
            <div className="p-4 bg-card rounded-xl border border-border flex flex-col items-center justify-center space-y-2">
              <span className="text-[11px] text-muted font-medium">RECOGNISED VEHICLE NUMBER PLATE</span>
              <div className="inline-flex items-center bg-white text-zinc-950 border-2 border-zinc-900 rounded-lg shadow-md px-4 py-2 font-mono font-black text-lg tracking-widest">
                <div className="flex flex-col items-center justify-center pr-2 mr-2 border-r border-zinc-400 text-[9px] leading-tight text-blue-700 font-bold">
                  <span>🇮🇳</span>
                  <span>IND</span>
                </div>
                <span>{selectedBreach.license_plate}</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">
                OCR Confidence: {Math.round(selectedBreach.ocr_confidence * 100)}%
              </span>
            </div>

            {/* Violation Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Vehicle Velocity</span>
                <span className="font-mono font-bold text-red-400">{selectedBreach.speed_kmh} km/h</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Posted Speed Limit</span>
                <span className="font-mono text-foreground">{selectedBreach.posted_limit_kmh} km/h</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Violation Delta</span>
                <span className="font-mono font-bold text-red-500">+{selectedBreach.delta_over_limit} km/h Over</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Location / Road</span>
                <span className="text-foreground font-medium">{selectedBreach.road_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Vehicle Classification</span>
                <span className="text-foreground">{selectedBreach.vehicle_type} (PCE {selectedBreach.pce_weight})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Timestamp</span>
                <span className="text-foreground font-mono">{new Date(selectedBreach.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setSelectedBreach(null)}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
