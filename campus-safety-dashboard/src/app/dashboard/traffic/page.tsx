"use client";

import { useEffect, useState, useRef } from "react";
import {
  Radio,
  Gauge,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Car,
  TrendingUp,
  Clock,
  MapPin,
  RefreshCw,
  Camera,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  PieChart,
  Calendar,
  Brain,
} from "lucide-react";
import { fetchFromFastApi, getFastApiWsUrl, FASTAPI_BASE, fetchRecentTelemetry } from "@/lib/api";
import MlVisionLabModal from "@/components/dashboard/MlVisionLabModal";

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
  window_duration_seconds: number;
  is_peak_hour: boolean;
  calculated_at: string;
  latitude: number;
  longitude: number;
}

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

interface ActiveLearningItem {
  sample_id: string;
  timestamp: string;
  device_id: string;
  image_path: string;
  predicted_plate: string;
  confidence: number;
  vehicle_type: string;
  flag_reason: string;
}

export default function TrafficRadarPage() {
  const [selectedNode, setSelectedNode] = useState<string>("RPI4_CAMERA_UNIT_01");
  const [telemetry, setTelemetry] = useState<ProcessedTelemetry | null>(null);
  const [history, setHistory] = useState<ProcessedTelemetry[]>([]);
  const [breaches, setBreaches] = useState<BreachRecord[]>([]);
  const [activeLearningQueue, setActiveLearningQueue] = useState<ActiveLearningItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedBreach, setSelectedBreach] = useState<BreachRecord | null>(null);
  const [isMlLabOpen, setIsMlLabOpen] = useState<boolean>(false);
  const [liveInstantSpeed, setLiveInstantSpeed] = useState<number>(0.0);
  const [isTargetPresent, setIsTargetPresent] = useState<boolean>(false);
  const [lastLiveTick, setLastLiveTick] = useState<string>("");
  const [extraAnalytics, setExtraAnalytics] = useState<{
    total_vehicles_observed: number;
    total_violations: number;
    compliance_rate_pct: number;
    peak_violation_hour: string;
    speed_distribution: Record<string, number>;
    vehicle_type_breakdown: Record<string, number>;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fallback initial sample data if backend is offline
  const fallbackTelemetry: ProcessedTelemetry = {
    vehicle_count: 22,
    flow_rate_vph: 264.0,
    approaching_count: 14,
    receding_count: 8,
    average_speed_kmh: 17.2,
    speed_85th_percentile: 19.8,
    median_speed_kmh: 16.5,
    speed_std_dev: 3.42,
    max_speed_kmh: 24.5,
    min_speed_kmh: 11.0,
    posted_limit_kmh: 20.0,
    overspeed_count: 3,
    violation_rate_percentage: 13.6,
    extreme_overspeed_count: 0,
    congestion_status: "Free Flow",
    radar_occupancy_pct: 18.5,
    congestion_index: 0.86,
    fine_suppression_active: false,
    device_id: "RPI4_CAMERA_UNIT_01",
    road_name: "Campus Test Corridor",
    window_start: "2026-11-11T20:55:00+05:30",
    window_end: "2026-11-11T21:00:00+05:30",
    window_duration_seconds: 300,
    is_peak_hour: false,
    calculated_at: "2026-11-11T21:00:00+05:30",
    latitude: 0.0,
    longitude: 0.0,
  };

  const loadAllData = async () => {
    try {
      // 1. Fetch consolidated recent telemetry & breaches
      const recentRes = await fetchRecentTelemetry(120, selectedNode).catch(() => null);
      if (recentRes?.success) {
        if (recentRes.analytics) setExtraAnalytics(recentRes.analytics);
        if (recentRes.stats) setStats(recentRes.stats);
        if (recentRes.breaches && recentRes.breaches.length > 0) {
          setBreaches(recentRes.breaches as any);
        }
      }

      // 2. Fallbacks and granular queries
      const statsRes = await fetchFromFastApi("/api/v1/telemetry/stats").catch(() => null);
      if (statsRes?.data) setStats(statsRes.data);

      const latestRes = await fetchFromFastApi(`/api/v1/telemetry/latest?device_id=${selectedNode}`).catch(() => null);
      if (latestRes?.data) setTelemetry(latestRes.data);

      const histRes = await fetchFromFastApi(`/api/v1/telemetry/history?device_id=${selectedNode}&limit=12`).catch(() => null);
      if (histRes?.data) setHistory(histRes.data);

      const breachesRes = await fetchFromFastApi("/api/v1/telemetry/breaches?limit=15").catch(() => null);
      if (breachesRes?.data && breachesRes.data.length > 0) setBreaches(breachesRes.data);

      const liveSpeedRes = await fetchFromFastApi("/api/v1/telemetry/live-speed").catch(() => null);
      if (liveSpeedRes?.data) {
        setLiveInstantSpeed(liveSpeedRes.data.speed_kmh ?? 0.0);
        setIsTargetPresent(Boolean(liveSpeedRes.data.is_target_present));
        if (liveSpeedRes.data.timestamp) setLastLiveTick(liveSpeedRes.data.timestamp);
      }

      const alRes = await fetchFromFastApi("/api/v1/telemetry/active-learning").catch(() => null);
      if (alRes?.data) setActiveLearningQueue(alRes.data);
    } catch {
      if (!telemetry) setTelemetry(fallbackTelemetry);
    }
  };

  useEffect(() => {
    loadAllData();
    const pollTimer = setInterval(loadAllData, 8000);

    try {
      const wsUrl = getFastApiWsUrl("/ws/telemetry");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "TELEMETRY_UPDATE") {
            if (msg.data.device_id === selectedNode || !selectedNode) {
              setTelemetry(msg.data);
            }
            setHistory((prev) => [msg.data, ...prev.slice(0, 15)]);
          } else if (msg.type === "BREACH_ALERT") {
            setBreaches((prev) => [msg.data, ...prev.slice(0, 20)]);
          } else if (msg.type === "LIVE_SPEED_TICK") {
            setLiveInstantSpeed(msg.data.speed_kmh ?? 0.0);
            setIsTargetPresent(Boolean(msg.data.is_target_present));
            setLastLiveTick(new Date().toISOString());
          } else if (msg.type === "INITIAL_STATE") {
            if (msg.stats) setStats(msg.stats);
            if (msg.latest) setTelemetry(msg.latest);
          }
        } catch (e) {
          console.warn("WebSocket parse error", e);
        }
      };

      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
    } catch {
      setIsConnected(false);
    }

    return () => {
      clearInterval(pollTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedNode]);

  const activeData = telemetry || fallbackTelemetry;

  const handleTriggerTestBurst = async () => {
    setIsSimulating(true);
    try {
      const speeds = [16.5, 18.0, 19.2, 17.8, 24.1, 26.5, 18.2, 19.0, 31.5, 17.2];
      await fetchFromFastApi("/api/v1/telemetry/summary", {
        method: "POST",
        body: JSON.stringify({
          device_id: selectedNode,
          raw_vehicle_count: speeds.length,
          speed_array: speeds,
          approaching_count: 6,
          receding_count: 4,
          radar_occupancy_pct: 18.0,
          posted_speed_limit: 20.0,
          road_name: selectedNode === "RPI4_NORTH_GATE" ? "North Campus Main Gate Road" : "South Campus Academic Complex Road",
        }),
      });
      await loadAllData();
    } catch (e) {
      console.warn("Simulation trigger failed", e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-sidebar border border-border p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">Edge Radar Telemetry & Enforcement</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  <Calendar className="w-3 h-3" />
                  Field Test: 11 Nov 2026 (3:00 PM – 9:00 PM IST Operational Window)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Server / Node Offline (@ 11:14 PM IST)
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Raspberry Pi 5 (1GB RAM Optimization) + HLK-LD2415H 24GHz Doppler Radar Telemetry Ingestion
              </p>
            </div>
          </div>
        </div>

        {/* Node Selector & Real-time Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 animate-ping" : "bg-emerald-500"
              }`}
            />
            <span className="font-medium text-foreground">
              {isConnected ? "FastAPI WebSocket Live" : "FastAPI REST Active"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <Camera className="w-3.5 h-3.5 text-muted" />
            <span>Unit 01 (Offline since 23:14 IST)</span>
          </div>

          <button
            onClick={handleTriggerTestBurst}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Ingesting..." : "Simulate Pi Telemetry"}</span>
          </button>
        </div>
      </div>

      {/* Nov 11 Field Test Summary & Offline Status Alert */}
      <div className="bg-gradient-to-r from-red-950/30 via-sidebar to-amber-950/20 border border-red-500/30 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-foreground text-sm">Nov 11 Field Test Run (3:00 PM – 9:00 PM IST)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  Node Offline Since 11:14 PM IST
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  72 Telemetry Windows Captured
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  39 HSRP Plates Preserved
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Single edge node (<b className="text-foreground">RPI4_CAMERA_UNIT_01</b>) was actively deployed on the Campus Test Corridor from <b>3:00 PM to 9:00 PM IST on November 11, 2026</b>.
                At <b>11:14 PM IST</b>, the camera CSI ribbon cable disconnected and the edge server transitioned to offline state.
                All 39 overspeeding breaches with synthetic Indian HSRP license plates remain preserved for safety audit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-center flex-shrink-0 flex-wrap">
            <button
              onClick={() => setIsMlLabOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Launch AI Vision &amp; Safety Lab</span>
            </button>
            <a
              href={`${FASTAPI_BASE}/api/v1/telemetry/field-test`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sidebar hover:bg-card border border-border text-foreground rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>Inspect Raw Audit JSON</span>
            </a>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Domain Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Domain 0: Real-Time Radar Velocity Clock (Per Second) */}
        <div className={`border rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
          isTargetPresent && liveInstantSpeed > 20.0
            ? "bg-red-950/30 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
            : isTargetPresent
            ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            : "bg-sidebar border-border"
        }`}>
          <div className="flex items-center justify-between text-muted text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className={`w-2 h-2 rounded-full ${isTargetPresent ? "bg-emerald-400 animate-ping" : "bg-zinc-600"}`} />
              LIVE RADAR SPEED
            </span>
            <Gauge className={`w-4 h-4 ${isTargetPresent ? "text-emerald-400" : "text-muted"}`} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-black font-mono tracking-tight ${
              isTargetPresent && liveInstantSpeed > 20.0
                ? "text-red-400"
                : isTargetPresent
                ? "text-emerald-400"
                : "text-zinc-500"
            }`}>
              {liveInstantSpeed > 0.0 ? liveInstantSpeed.toFixed(1) : "0.0"}
            </span>
            <span className="text-xs font-semibold text-muted">km/h</span>
          </div>
          <div className="mt-2.5 text-[11px] text-muted flex items-center justify-between border-t border-border/60 pt-2">
            <span className="font-medium">
              {isTargetPresent ? (
                <span className={liveInstantSpeed > 20.0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                  ● Target In Beam
                </span>
              ) : (
                <span className="text-zinc-500">○ No Target (Beam Clear)</span>
              )}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">1 Hz Stream</span>
          </div>
        </div>

        {/* Domain 1: Traffic Volume & Flow Rate */}
        <div className="bg-sidebar border border-border rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-medium mb-2">
            <span>1. FLOW RATE & VOLUME</span>
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{activeData.flow_rate_vph}</span>
            <span className="text-xs font-semibold text-muted">VPH (projected)</span>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center justify-between border-t border-border pt-2.5">
            <span>Window Volume: <b className="text-foreground">{activeData.vehicle_count}</b> passes</span>
            <span>Split: <b className="text-emerald-500">↑{activeData.approaching_count}</b> <b className="text-blue-500">↓{activeData.receding_count}</b></span>
          </div>
        </div>

        {/* Domain 2: Velocity & 85th Percentile Speed */}
        <div className="bg-sidebar border border-border rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-medium mb-2">
            <span>2. 85TH PERCENTILE SPEED</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{activeData.speed_85th_percentile}</span>
            <span className="text-xs font-semibold text-muted">km/h (V85)</span>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center justify-between border-t border-border pt-2.5">
            <span>Posted Limit: <b className="text-foreground">{activeData.posted_limit_kmh} km/h</b></span>
            <span className={activeData.speed_85th_percentile > activeData.posted_limit_kmh ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {activeData.speed_85th_percentile > activeData.posted_limit_kmh
                ? `+${(activeData.speed_85th_percentile - activeData.posted_limit_kmh).toFixed(1)} km/h`
                : "Compliant"}
            </span>
          </div>
        </div>

        {/* Domain 3: Congestion & Road Density Index */}
        <div className="bg-sidebar border border-border rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-medium mb-2">
            <span>3. CONGESTION & DENSITY</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{activeData.congestion_status}</span>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center justify-between border-t border-border pt-2.5">
            <span>Index (V/Vp): <b className="text-foreground">{activeData.congestion_index}</b></span>
            <span>Occupancy: <b className="text-foreground">{activeData.radar_occupancy_pct}%</b></span>
          </div>
        </div>

        {/* Domain 4: Safety Compliance & Violation Ratio */}
        <div className="bg-sidebar border border-border rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-medium mb-2">
            <span>4. VIOLATION RATIO</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-500">{activeData.violation_rate_percentage}%</span>
            <span className="text-xs font-semibold text-muted">of traffic</span>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center justify-between border-t border-border pt-2.5">
            <span>Overspeed: <b className="text-foreground">{activeData.overspeed_count}</b></span>
            <span className="text-red-400 font-medium">Extreme (&gt;30): {activeData.extreme_overspeed_count}</span>
          </div>
        </div>
      </div>

      {/* Velocity Profile & Statistical Analytics Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speed Dispersion & Engineering Breakdown */}
        <div className="bg-sidebar border border-border rounded-2xl p-6 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Velocity Profile Dispersion</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-muted">
              {activeData.device_id}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Mean Operating Speed (V̄)</span>
              <span className="font-mono font-bold text-foreground">{activeData.average_speed_kmh} km/h</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Median Speed (V50 Baseline)</span>
              <span className="font-mono font-bold text-foreground">{activeData.median_speed_kmh} km/h</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Speed Variance / Std Deviation (σ)</span>
              <span className="font-mono font-bold text-foreground">{activeData.speed_std_dev} km/h</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Recorded Speed Range</span>
              <span className="font-mono font-bold text-foreground">
                {activeData.min_speed_kmh} – {activeData.max_speed_kmh} km/h
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Peak Rush Hour Active</span>
              <span className={`font-semibold ${activeData.is_peak_hour ? "text-amber-400" : "text-muted"}`}>
                {activeData.is_peak_hour ? "YES (Commute Window)" : "NO (Standard Flow)"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/50">
              <span className="text-muted">Gridlock Fine Suppression</span>
              <span className={`font-semibold ${activeData.fine_suppression_active ? "text-red-400" : "text-emerald-400"}`}>
                {activeData.fine_suppression_active ? "ENGAGED (<0.40)" : "DISABLED (Normal)"}
              </span>
            </div>
          </div>
        </div>

        {/* Edge Node Hardware & State Machine Status */}
        <div className="bg-sidebar border border-border rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Raspberry Pi 4 Edge Sensing Pipeline (HLK-LD2415H Doppler)</span>
            </h3>
            <span className="text-xs text-muted">RAM &lt; 35MB (Zero-AI C++)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-card border border-border rounded-xl">
              <p className="text-[11px] text-muted font-medium mb-1">State Machine Mode</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-foreground">IDLE ➔ TRACK ➔ PASS</span>
              </div>
            </div>
            <div className="p-3 bg-card border border-border rounded-xl">
              <p className="text-[11px] text-muted font-medium mb-1">UART Baud Rate</p>
              <span className="text-xs font-mono font-bold text-foreground">9600 baud (/dev/ttyUSB0)</span>
            </div>
            <div className="p-3 bg-card border border-border rounded-xl">
              <p className="text-[11px] text-muted font-medium mb-1">Cellular 4G LTE Mesh</p>
              <span className="text-xs font-mono font-bold text-foreground">Tailscale CGNAT Bypass</span>
            </div>
          </div>

          {/* Historical Telemetry Stream Table */}
          <div className="border border-border rounded-xl overflow-hidden mt-3">
            <div className="bg-card px-4 py-2.5 border-b border-border text-xs font-semibold text-muted flex items-center justify-between">
              <span>Recent Summary Windows (1–5 Min Aggregations)</span>
              <span>{history.length} Aggregations</span>
            </div>
            <div className="max-h-[170px] overflow-y-auto divide-y divide-border text-xs">
              {history.length === 0 ? (
                <div className="p-4 text-center text-muted">No historical stream received yet.</div>
              ) : (
                history.slice(0, 5).map((h, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-card/40 transition-colors">
                    <div>
                      <span className="font-mono font-bold text-foreground">{h.device_id}</span>
                      <span className="text-muted ml-2" suppressHydrationWarning>
                        {new Date(h.calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Vol: <b>{h.vehicle_count}</b></span>
                      <span>V85: <b className="text-emerald-400">{h.speed_85th_percentile} km/h</b></span>
                      <span>Flow: <b>{h.flow_rate_vph} VPH</b></span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                        {h.congestion_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Traffic Telemetry & Velocity Distribution Analytics */}
      {extraAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Velocity Distribution */}
          <div className="bg-sidebar border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>Speed Distribution</span>
              </h4>
              <span className="text-[10px] text-muted font-mono">Past 2 Hours</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(extraAnalytics.speed_distribution || {}).map(([bucket, count]) => (
                <div key={bucket} className="bg-card/70 border border-border/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-muted block font-medium">{bucket}</span>
                  <span className="text-sm font-bold font-mono text-foreground">{count} <span className="text-[10px] font-normal text-muted">passes</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Classification Breakdown */}
          <div className="bg-sidebar border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vehicle Fleet Split</span>
              </h4>
              <span className="text-[10px] text-muted font-mono">YOLOv8 Classified</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(extraAnalytics.vehicle_type_breakdown || {}).length > 0 ? (
                Object.entries(extraAnalytics.vehicle_type_breakdown).map(([vtype, count]) => (
                  <div key={vtype} className="flex items-center justify-between bg-card/70 border border-border/60 rounded-xl px-3 py-2 flex-1 min-w-[100px]">
                    <span className="text-xs font-medium text-foreground">{vtype}</span>
                    <span className="text-xs font-bold font-mono text-primary">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted p-2">Monitoring incoming traffic passes...</div>
              )}
            </div>
          </div>

          {/* Compliance & Rush-Hour Peak */}
          <div className="bg-sidebar border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Safety Compliance & Trends</span>
              </h4>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Live Ingestion</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-card/70 border border-border/60 rounded-xl p-2.5">
                <span className="text-muted">Compliance Rate</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {extraAnalytics.compliance_rate_pct}%
                </span>
              </div>
              <div className="flex justify-between items-center bg-card/70 border border-border/60 rounded-xl p-2.5">
                <span className="text-muted">Peak Violation Hour</span>
                <span className="font-bold text-red-400 font-mono text-sm">
                  {extraAnalytics.peak_violation_hour}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Breaches & Server-Side Machine Learning Vision Feed with HSRP Plate Display */}
      <div className="bg-sidebar border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-400" />
              <span>Speed Breach Ingestion & Automated License Plate Recognition (ALPR)</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Overspeeding vehicle registration numbers captured via Doppler radar triggers & server-side OCR
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
            {breaches.length} Speed Violations Logged
          </span>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-card text-muted font-semibold border-b border-border">
              <tr>
                <th className="p-3">Breach ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Sensing Unit</th>
                <th className="p-3">Clocked Speed</th>
                <th className="p-3">Vehicle Type (PCE)</th>
                <th className="p-3 text-center">Vehicle Number Plate (ALPR)</th>
                <th className="p-3">Snapshot</th>
                <th className="p-3">OCR Confidence</th>
                <th className="p-3">Active Learning Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breaches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted">
                    No speed breaches logged yet. Vehicles are currently traveling within the posted limit.
                  </td>
                </tr>
              ) : (
                breaches.map((b) => (
                  <tr
                    key={b.breach_id}
                    onClick={() => setSelectedBreach(b)}
                    className="hover:bg-card/60 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-foreground">{b.breach_id}</td>
                    <td className="p-3 text-muted" suppressHydrationWarning>
                      {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 text-foreground font-medium">Unit 01 (Radar+Cam)</td>
                    <td className="p-3 font-mono">
                      <span className="text-red-400 font-bold">{b.speed_kmh} km/h</span>
                      <span className="text-[10px] text-muted ml-1.5">(+{b.delta_over_limit} over)</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-foreground">{b.vehicle_type}</span>
                      <span className="text-[10px] text-muted ml-1">({b.pce_weight} PCE)</span>
                    </td>
                    {/* HSRP High-Visibility License Plate */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center bg-white text-zinc-950 border border-zinc-700 rounded shadow-sm px-2.5 py-1 font-mono font-black text-xs tracking-wider select-all">
                        <div className="flex flex-col items-center justify-center pr-1.5 mr-1.5 border-r border-zinc-400 text-[8px] leading-tight text-blue-700 font-bold">
                          <span>IND</span>
                        </div>
                        <span className="font-extrabold tracking-widest text-zinc-950">{b.license_plate}</span>
                      </div>
                    </td>
                    {/* Camera Snapshot Thumbnail */}
                    <td className="p-3">
                      {b.image_url ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={b.image_url.startsWith('http') ? b.image_url : `${FASTAPI_BASE}${b.image_url}`}
                            alt="Snapshot"
                            className="w-10 h-7 object-cover rounded border border-border"
                          />
                          <Camera className="w-3.5 h-3.5 text-primary" />
                        </div>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
                          Radar Edge (Zero-Storage)
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-semibold ${
                          b.ocr_confidence < 0.75 ? "text-amber-400 font-bold" : "text-emerald-400"
                        }`}
                      >
                        {Math.round(b.ocr_confidence * 100)}%
                      </span>
                    </td>
                    <td className="p-3">
                      {b.routed_to_active_learning ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Queued (&lt;75% Conf)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium text-muted">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breach Evidence Preview Modal */}
      {selectedBreach && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sidebar border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-foreground text-sm">
                  Overspeed Evidence Ticket: {selectedBreach.breach_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBreach(null)}
                className="text-muted hover:text-foreground text-xs px-2 py-1 rounded bg-card"
              >
                ✕ Close
              </button>
            </div>

            {/* Camera Evidence Snapshot or Privacy Zero-Storage Badge */}
            {selectedBreach.image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black/60">
                <img
                  src={
                    selectedBreach.image_url.startsWith("http")
                      ? selectedBreach.image_url
                      : `${FASTAPI_BASE}${selectedBreach.image_url}`
                  }
                  alt={`Evidence Snapshot ${selectedBreach.breach_id}`}
                  className="w-full h-48 object-cover rounded-xl"
                  onError={(e) => {
                    // Hide if file not found
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/80 text-red-400 font-mono text-[11px] font-bold backdrop-blur-sm border border-red-500/30">
                  RADAR CLOCKED: {selectedBreach.speed_kmh} km/h (Limit: {selectedBreach.posted_limit_kmh} km/h)
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-emerald-950/20 border border-emerald-500/30 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Zero-Storage Radar Edge Record</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Raw camera frames are bypassed to operate within a strict &lt;10&nbsp;MB RAM budget and safeguard commuter privacy. 24GHz Doppler radar validated velocity: <span className="text-red-400 font-mono font-bold">{selectedBreach.speed_kmh} km/h</span>.
                </p>
              </div>
            )}

            {/* Official HSRP Plate Header */}
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
                ALPR OCR Confidence: {Math.round(selectedBreach.ocr_confidence * 100)}%
              </span>
            </div>

            {/* Violation Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Recorded Vehicle Velocity</span>
                <span className="font-mono font-bold text-red-400 text-sm">{selectedBreach.speed_kmh} km/h</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Posted Road Limit</span>
                <span className="font-mono text-foreground">{selectedBreach.posted_limit_kmh} km/h</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Excess Speed (Delta)</span>
                <span className="font-mono font-bold text-red-500">+{selectedBreach.delta_over_limit} km/h Over</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Capturing Sensor</span>
                <span className="text-foreground font-medium">RPi-5 Doppler Radar Unit (Zero-Storage Edge)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Vehicle Classification</span>
                <span className="text-foreground">{selectedBreach.vehicle_type} (PCE {selectedBreach.pce_weight})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Timestamp</span>
                <span className="text-foreground font-mono" suppressHydrationWarning>{new Date(selectedBreach.timestamp).toLocaleString()}</span>
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

      {/* Active Learning Retraining Pipeline Card */}
      <div className="bg-sidebar border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Continuous Active Learning & Model Hot-Swapping Pipeline</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Low-confidence predictions (&lt;75%) are automatically buffered on the server and fine-tuned with a 20% anchor mix, then hot-swapped in &lt;10ms.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
            {activeLearningQueue.length} Samples in Retraining Queue
          </span>
        </div>

        {activeLearningQueue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {activeLearningQueue.slice(0, 3).map((item) => (
              <div key={item.sample_id} className="p-3 bg-card border border-border rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">{item.sample_id}</span>
                  <span className="text-[10px] text-amber-400 font-semibold">{Math.round(item.confidence * 100)}% Conf</span>
                </div>
                <p className="font-mono text-foreground font-semibold">{item.predicted_plate}</p>
                <p className="text-[11px] text-muted">{item.flag_reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Active learning queue is clean. Models are operating above the 75% enterprise confidence threshold.</span>
          </div>
        )}
      </div>

      {/* Interactive AI Vision & Safety ML Lab Modal */}
      <MlVisionLabModal isOpen={isMlLabOpen} onClose={() => setIsMlLabOpen(false)} />
    </div>
  );
}
