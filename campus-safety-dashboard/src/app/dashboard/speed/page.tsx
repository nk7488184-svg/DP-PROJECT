"use client";

import { useState, useEffect } from "react";
import {
  Gauge,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Filter,
  Car,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  PlusCircle,
  XCircle,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import MagicBento, { MagicBentoItem } from "@/components/ui/MagicBento";

interface SegmentData {
  id: number;
  name: string;
  highway: string;
  speed_limit: number;
  length_m: number;
  p50: number;
  p85: number;
  n_trips: number;
  status: "normal" | "overspeed" | "slowdown" | "severe_slowdown" | "nodata";
  hourly_data: { hour: string; speed: number; limit: number }[];
  linked_complaint?: { id: string; title: string; category: string };
  repair_verification?: {
    verdict: "verified_improved" | "no_change_detected" | "not_enough_data";
    before_median: number;
    after_median: number;
    change_pct: number;
  };
}

interface SpeedEventItem {
  id: number;
  type: "OVERSPEED" | "SLOWDOWN" | "DECEL_CLUSTER";
  segment_id: number;
  segment_name: string;
  severity: 1 | 2 | 3;
  p85?: number;
  current_p50?: number;
  limit: number;
  first_seen: string;
  last_seen: string;
  status: "open" | "acknowledged" | "linked" | "closed";
}

const INITIAL_SEGMENTS: SegmentData[] = [
  {
    id: 101,
    name: "Kamand Valley Expressway (KM 2 - 4)",
    highway: "primary",
    speed_limit: 50,
    length_m: 1200,
    p50: 64,
    p85: 74,
    n_trips: 42,
    status: "overspeed",
    hourly_data: [
      { hour: "00:00", speed: 58, limit: 50 },
      { hour: "04:00", speed: 62, limit: 50 },
      { hour: "08:00", speed: 68, limit: 50 },
      { hour: "12:00", speed: 64, limit: 50 },
      { hour: "16:00", speed: 71, limit: 50 },
      { hour: "20:00", speed: 65, limit: 50 },
    ],
    linked_complaint: { id: "CMP-084", title: "Frequent overspeeding zone", category: "Driver Behavior" },
  },
  {
    id: 102,
    name: "North Campus Link Road (Academic Block Descent)",
    highway: "secondary",
    speed_limit: 40,
    length_m: 650,
    p50: 16,
    p85: 22,
    n_trips: 38,
    status: "severe_slowdown",
    hourly_data: [
      { hour: "00:00", speed: 34, limit: 40 },
      { hour: "04:00", speed: 32, limit: 40 },
      { hour: "08:00", speed: 18, limit: 40 },
      { hour: "12:00", speed: 16, limit: 40 },
      { hour: "16:00", speed: 15, limit: 40 },
      { hour: "20:00", speed: 19, limit: 40 },
    ],
    linked_complaint: { id: "CMP-021", title: "Deep pothole cluster causing abrupt braking", category: "Pothole" },
    repair_verification: {
      verdict: "verified_improved",
      before_median: 16,
      after_median: 34,
      change_pct: 112.5,
    },
  },
  {
    id: 103,
    name: "South Campus Cedar Loop Road",
    highway: "tertiary",
    speed_limit: 30,
    length_m: 800,
    p50: 28,
    p85: 32,
    n_trips: 19,
    status: "normal",
    hourly_data: [
      { hour: "00:00", speed: 26, limit: 30 },
      { hour: "04:00", speed: 25, limit: 30 },
      { hour: "08:00", speed: 29, limit: 30 },
      { hour: "12:00", speed: 28, limit: 30 },
      { hour: "16:00", speed: 30, limit: 30 },
      { hour: "20:00", speed: 27, limit: 30 },
    ],
  },
  {
    id: 104,
    name: "Hostel Block C - Cafeteria Avenue",
    highway: "residential",
    speed_limit: 25,
    length_m: 450,
    p50: 14,
    p85: 18,
    n_trips: 24,
    status: "slowdown",
    hourly_data: [
      { hour: "00:00", speed: 22, limit: 25 },
      { hour: "04:00", speed: 20, limit: 25 },
      { hour: "08:00", speed: 13, limit: 25 },
      { hour: "12:00", speed: 14, limit: 25 },
      { hour: "16:00", speed: 15, limit: 25 },
      { hour: "20:00", speed: 16, limit: 25 },
    ],
    linked_complaint: { id: "CMP-112", title: "Unmarked speed breaker causing traffic shockwaves", category: "Damaged Pavement" },
  },
  {
    id: 105,
    name: "Auditorium Roundabout & Hill Curve",
    highway: "residential",
    speed_limit: 25,
    length_m: 350,
    p50: 24,
    p85: 27,
    n_trips: 31,
    status: "normal",
    hourly_data: [
      { hour: "00:00", speed: 22, limit: 25 },
      { hour: "04:00", speed: 21, limit: 25 },
      { hour: "08:00", speed: 24, limit: 25 },
      { hour: "12:00", speed: 25, limit: 25 },
      { hour: "16:00", speed: 24, limit: 25 },
      { hour: "20:00", speed: 23, limit: 25 },
    ],
  },
  {
    id: 106,
    name: "Upper Helipad Service Spur",
    highway: "service",
    speed_limit: 20,
    length_m: 280,
    p50: 0,
    p85: 0,
    n_trips: 2,
    status: "nodata",
    hourly_data: [
      { hour: "00:00", speed: 0, limit: 20 },
      { hour: "04:00", speed: 0, limit: 20 },
      { hour: "08:00", speed: 0, limit: 20 },
      { hour: "12:00", speed: 0, limit: 20 },
      { hour: "16:00", speed: 0, limit: 20 },
      { hour: "20:00", speed: 0, limit: 20 },
    ],
  },
];

const INITIAL_EVENTS: SpeedEventItem[] = [
  {
    id: 201,
    type: "OVERSPEED",
    segment_id: 101,
    segment_name: "Kamand Valley Expressway (KM 2 - 4)",
    severity: 2,
    p85: 74,
    limit: 50,
    first_seen: "Today, 08:15 AM",
    last_seen: "12 mins ago",
    status: "open",
  },
  {
    id: 202,
    type: "DECEL_CLUSTER",
    segment_id: 102,
    segment_name: "North Campus Link Road (Academic Block Descent)",
    severity: 3,
    current_p50: 16,
    limit: 40,
    first_seen: "Today, 09:40 AM",
    last_seen: "4 mins ago",
    status: "linked",
  },
  {
    id: 203,
    type: "SLOWDOWN",
    segment_id: 104,
    segment_name: "Hostel Block C - Cafeteria Avenue",
    severity: 1,
    current_p50: 14,
    limit: 25,
    first_seen: "Today, 11:10 AM",
    last_seen: "28 mins ago",
    status: "acknowledged",
  },
];

const SPEED_BENTO_ITEMS: MagicBentoItem[] = [
  {
    title: "85th-Percentile Velocity Profile",
    description: "Interactive scrubbing over 24-hour P85 speeds with real-time breach comparison against posted limits",
    visual: "analytics",
    label: "Velocity Profiling",
    colSpan: 2,
    rowSpan: 2,
  },
  {
    title: "Hourly Trip Density & Exposure",
    description: "Volume density histogram across monitored Kamand Valley road segments (156 trips logged today)",
    visual: "dashboard",
    label: "Traffic Exposure",
    colSpan: 2,
    rowSpan: 1,
  },
  {
    label: "Hazard Grounding",
    colSpan: 1,
    rowSpan: 1,
    content: (
      <div className="flex flex-col justify-between h-full py-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Hazard Slowdown</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40 font-mono">CMP-021</span>
        </div>
        <div className="my-2">
          <div className="text-2xl font-black text-rose-400 font-mono">16 km/h</div>
          <div className="text-xs font-semibold text-foreground mt-0.5">North Campus Link Road</div>
          <div className="text-[11px] text-muted leading-tight mt-1">Deep pothole cluster causing severe vehicle braking (-60% vs limit).</div>
        </div>
        <div className="text-[10px] font-semibold text-rose-400/90 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Active Deceleration Shockwave</span>
        </div>
      </div>
    ),
  },
  {
    label: "Repair Verification",
    colSpan: 1,
    rowSpan: 1,
    content: (
      <div className="flex flex-col justify-between h-full py-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Post-Fix Telemetry</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 font-mono">14-Day Audit</span>
        </div>
        <div className="my-2">
          <div className="text-2xl font-black text-emerald-400 font-mono">+112.5%</div>
          <div className="text-xs font-semibold text-foreground mt-0.5">Speed Recovery Verified</div>
          <div className="text-[11px] text-muted leading-tight mt-1">Median speed restored from 16 km/h to 34 km/h after pothole patch.</div>
        </div>
        <div className="text-[10px] font-semibold text-emerald-400/90 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Verdict: Verified Improved</span>
        </div>
      </div>
    ),
  },
];

export default function SpeedTrackerPage() {
  const [segments, setSegments] = useState<SegmentData[]>(INITIAL_SEGMENTS);
  const [events, setEvents] = useState<SpeedEventItem[]>(INITIAL_EVENTS);
  const [selectedSegment, setSelectedSegment] = useState<SegmentData>(INITIAL_SEGMENTS[0]);
  const [timeFilter, setTimeFilter] = useState<"1h" | "24h" | "7d">("24h");
  const [severityFilter, setSeverityFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Probe FastAPI backend connection on mount
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch("http://127.0.0.1:8000/healthz", { mode: "cors" });
        if (res.ok) {
          setBackendConnected(true);
        }
      } catch {
        setBackendConnected(false);
      }
    }
    checkBackend();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/healthz");
      if (res.ok) setBackendConnected(true);
    } catch {
      // Keep state
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleUpdateEventStatus = (eventId: number, newStatus: "acknowledged" | "closed" | "linked") => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev))
    );
  };

  const getStatusColorBadge = (status: SegmentData["status"]) => {
    switch (status) {
      case "overspeed":
        return "bg-purple-950/60 text-purple-400 border-purple-800/60";
      case "normal":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
      case "slowdown":
        return "bg-amber-950/60 text-amber-400 border-amber-800/60";
      case "severe_slowdown":
        return "bg-rose-950/60 text-rose-400 border-rose-800/60";
      case "nodata":
      default:
        return "bg-zinc-800/60 text-zinc-400 border-zinc-700/60";
    }
  };

  const getStatusLabel = (status: SegmentData["status"]) => {
    switch (status) {
      case "overspeed":
        return "Over Speed Limit (>1.1x)";
      case "normal":
        return "Normal Flow (0.8x - 1.1x)";
      case "slowdown":
        return "Slowdown (0.5x - 0.8x)";
      case "severe_slowdown":
        return "Severe Slowdown (<0.5x)";
      case "nodata":
      default:
        return "No Data (<5 trips)";
    }
  };

  const filteredEvents = events.filter((e) => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Speed Tracker Observatory</h2>
              <p className="text-xs text-muted">
                GPS telemetry, segment speed profiling, and automatic road hazard correlation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                backendConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-amber-400"
              )}
            />
            <span className="text-muted">
              FastAPI Engine:{" "}
              <strong className="text-foreground">{backendConnected ? "Connected (:8000)" : "Mock Simulator"}</strong>
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-input border border-border rounded-lg text-xs font-medium text-foreground hover:bg-card-hover transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">Overspeed Zones</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">1</span>
            <span className="text-xs text-purple-400 font-medium">P85 &gt; 1.1x limit</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Requires speed breakers / enforcement</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">Hazard Slowdowns</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">2</span>
            <span className="text-xs text-rose-400 font-medium">P50 &lt; 0.6x baseline</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Correlated with active pothole reports</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">Active GPS Vehicles</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">156</span>
            <span className="text-xs text-emerald-400 font-medium">+12% peak traffic</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Campus shuttles, trucks &amp; logged drives</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">Monitored Segments</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">6 / 6</span>
            <span className="text-xs text-muted font-medium">100% active grid</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Split in ~150m PostGIS geometries</p>
        </div>
      </div>

      {/* ─── REACT BITS MAGIC BENTO ANALYTICS HUB ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Speed Telemetry Analytics Hub</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                Interactive Magic Bento
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Live cursor spotlights, velocity scrubbing, trip exposure histogram, and automated hazard correlation
            </p>
          </div>
        </div>

        <MagicBento
          items={SPEED_BENTO_ITEMS}
          columns={4}
          rowHeight={210}
          gap={14}
          radius={18}
          theme="dark"
          glowColor="#10b981"
          enableBorderGlow={true}
          enableSpotlight={true}
          spotlightRadius={320}
          clickEffect={true}
        />
      </div>

      {/* Main Grid: Segments Monitor + Segment Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Road Segments Table / Visualizer */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span>Campus Road Segments — Real-time Speeds</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                  5-min rollups
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">Click any segment to inspect 24h speed distribution and repair status</p>
            </div>

            {/* Time Filter Pill */}
            <div className="flex items-center gap-1 bg-input border border-border rounded-lg p-0.5 text-xs">
              {(["1h", "24h", "7d"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    timeFilter === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Color Legend Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-input/40 border border-border/40 text-xs text-muted mb-4">
            <span className="font-semibold text-foreground">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Overspeed (&gt;1.1x)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Normal (0.8 - 1.1x)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Slow (0.5 - 0.8x)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Very Slow (&lt;0.5x)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <span>No Data (&lt;5 trips)</span>
            </div>
          </div>

          {/* Segment List */}
          <div className="space-y-2.5 flex-1">
            {segments.map((seg) => {
              const isSelected = selectedSegment.id === seg.id;
              const ratio = seg.speed_limit > 0 ? seg.p50 / seg.speed_limit : 0;

              return (
                <div
                  key={seg.id}
                  onClick={() => setSelectedSegment(seg)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                    isSelected
                      ? "bg-card-hover/60 border-primary shadow-sm"
                      : "bg-input/20 border-border hover:bg-input/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-primary">#{seg.id}</span>
                      <h4 className="text-sm font-semibold text-foreground truncate">{seg.name}</h4>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-muted/20">
                        {seg.highway}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Length: {seg.length_m}m</span>
                      <span>•</span>
                      <span>Trips (30m): <strong className="text-foreground">{seg.n_trips}</strong></span>
                      {seg.linked_complaint && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {seg.linked_complaint.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Speed Bar & Metrics */}
                  <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="text-base font-bold text-foreground font-mono">
                          {seg.p50 > 0 ? `${seg.p50} km/h` : "—"}
                        </span>
                        <span className="text-[11px] text-muted">/ {seg.speed_limit} max</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono">P85: {seg.p85 > 0 ? `${seg.p85} km/h` : "—"}</div>
                    </div>

                    <div className={cn("px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap", getStatusColorBadge(seg.status))}>
                      {getStatusLabel(seg.status)}
                    </div>

                    <ChevronRight className={cn("w-4 h-4 text-muted transition-transform hidden sm:block", isSelected && "translate-x-1 text-primary")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Segment Details Drawer */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-xs font-mono text-primary font-bold">SEGMENT #{selectedSegment.id}</span>
              <h3 className="text-base font-bold text-foreground">{selectedSegment.name}</h3>
            </div>
            <div className={cn("px-2 py-0.5 rounded text-[11px] font-semibold border", getStatusColorBadge(selectedSegment.status))}>
              {selectedSegment.status.toUpperCase()}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-input/40 border border-border/60">
              <span className="text-[10px] text-muted block uppercase">Speed Limit</span>
              <span className="text-lg font-bold text-foreground font-mono">{selectedSegment.speed_limit}</span>
              <span className="text-[10px] text-muted block">km/h</span>
            </div>
            <div className="p-2.5 rounded-lg bg-input/40 border border-border/60">
              <span className="text-[10px] text-muted block uppercase">P50 (Median)</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{selectedSegment.p50 || "—"}</span>
              <span className="text-[10px] text-muted block">km/h</span>
            </div>
            <div className="p-2.5 rounded-lg bg-input/40 border border-border/60">
              <span className="text-[10px] text-muted block uppercase">P85 Speed</span>
              <span className="text-lg font-bold text-purple-400 font-mono">{selectedSegment.p85 || "—"}</span>
              <span className="text-[10px] text-muted block">km/h</span>
            </div>
          </div>

          {/* 24-Hour Speed Profile Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                24-Hour Speed Profile
              </h4>
              <span className="text-[10px] text-muted">Dashed line = Speed Limit</span>
            </div>

            <div className="h-44 w-full bg-input/20 border border-border/60 rounded-xl p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedSegment.hourly_data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 80]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f2318",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                  <ReferenceLine y={selectedSegment.speed_limit} stroke="#ef4444" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#speedGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Linked Complaint Context */}
          {selectedSegment.linked_complaint ? (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-rose-400 font-bold">LINKED COMPLAINT</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-300">
                  {selectedSegment.linked_complaint.id}
                </span>
              </div>
              <p className="font-semibold text-foreground">{selectedSegment.linked_complaint.title}</p>
              <p className="text-[11px] text-muted mt-0.5">Category: {selectedSegment.linked_complaint.category}</p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-input/20 border border-border/40 text-xs text-muted flex items-center gap-2">
              <Info className="w-4 h-4 text-muted flex-shrink-0" />
              <span>No active hazard complaints linked to this road segment.</span>
            </div>
          )}

          {/* Repair Verification Card (Post-fix telemetry analysis) */}
          {selectedSegment.repair_verification && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Repair Verification Engine</span>
              </div>
              <p className="text-[11px] text-muted">
                Post-resolution traffic telemetry analysis (14-day pre/post window comparison):
              </p>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted block text-[10px]">Pre-Repair</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedSegment.repair_verification.before_median} km/h
                  </span>
                </div>
                <div className="text-emerald-400 font-bold text-sm">
                  &rarr; +{selectedSegment.repair_verification.change_pct}%
                </div>
                <div className="text-right">
                  <span className="text-muted block text-[10px]">Post-Repair</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedSegment.repair_verification.after_median} km/h
                  </span>
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verdict: Verified Improved flow recovery</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Live Speed Events Table & Escalation */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span>Automated Speed Anomaly Events</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-input text-muted border border-border">
                {filteredEvents.length} events
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Hysteresis-validated anomalies ready for authority action or one-click complaint escalation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="1">Severity 1 (Moderate)</option>
              <option value="2">Severity 2 (High)</option>
              <option value="3">Severity 3 (Critical)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="linked">Linked</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Road Segment</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Telemetry Metric</th>
                <th className="py-2.5 px-3">First Seen</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-card-hover/30 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded font-mono font-semibold text-[11px]",
                        ev.type === "OVERSPEED"
                          ? "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                          : ev.type === "DECEL_CLUSTER"
                          ? "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                          : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                      )}
                    >
                      {ev.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-foreground max-w-xs truncate">
                    {ev.segment_name}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        ev.severity === 3
                          ? "bg-rose-500/10 text-rose-400"
                          : ev.severity === 2
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-blue-500/10 text-blue-400"
                      )}
                    >
                      Level {ev.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-muted">
                    {ev.type === "OVERSPEED"
                      ? `P85: ${ev.p85} km/h (Limit: ${ev.limit} km/h)`
                      : `P50: ${ev.current_p50} km/h (Limit: ${ev.limit} km/h)`}
                  </td>
                  <td className="py-3 px-3 text-muted">{ev.first_seen}</td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                        ev.status === "open"
                          ? "bg-rose-500/10 text-rose-400"
                          : ev.status === "acknowledged"
                          ? "bg-amber-500/10 text-amber-400"
                          : ev.status === "linked"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {ev.status === "open" && (
                        <button
                          onClick={() => handleUpdateEventStatus(ev.id, "acknowledged")}
                          className="px-2 py-1 rounded bg-input hover:bg-card-hover border border-border text-[11px] font-medium text-foreground transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {ev.status !== "linked" && (
                        <button
                          onClick={() => handleUpdateEventStatus(ev.id, "linked")}
                          className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Create Complaint</span>
                        </button>
                      )}
                      {ev.status !== "closed" && (
                        <button
                          onClick={() => handleUpdateEventStatus(ev.id, "closed")}
                          className="px-2 py-1 rounded bg-input hover:bg-rose-950/40 text-muted hover:text-rose-400 text-[11px] transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
