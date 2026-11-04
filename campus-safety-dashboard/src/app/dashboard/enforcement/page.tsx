"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Zap,
  Car,
  ScanLine,
  Timer,
  Brain,
  RefreshCw,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Flag,
  Download,
  Signal,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

interface EdgeNode {
  id: string;
  location: string;
  status: "online" | "offline" | "degraded";
  uptime_hours: number;
  ram_usage_mb: number;
  ram_pct: number;
  cellular_signal: 1 | 2 | 3 | 4 | 5;
  last_heartbeat: string;
  firmware_version: string;
  total_captures_today: number;
  breaches_today: number;
  lat: number;
  lng: number;
}

interface BreachEvent {
  id: number;
  node_id: string;
  timestamp: string;
  radar_speed_kmh: number;
  speed_limit_kmh: number;
  overspeed_pct: number;
  vehicle_class: "car" | "bus" | "truck" | "motorcycle" | "auto_rickshaw";
  vehicle_confidence: number;
  plate_text: string | null;
  plate_confidence: number | null;
  pce_weight: number;
  status: "new" | "reviewed" | "exported" | "flagged";
}

interface VehicleStats {
  vehicle_class: string;
  count: number;
  pce_total: number;
  avg_speed: number;
  breach_rate: number;
}

interface V85Location {
  location: string;
  speed_limit: number;
  v85_speed: number;
  total_vehicles: number;
  breach_count: number;
  breach_rate: number;
  hourly_data: { hour: string; v85: number; count: number; limit: number }[];
}

interface ALQueueItem {
  id: number;
  breach_id: number;
  predicted_class: string;
  confidence: number;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — EDGE NODES
   ═══════════════════════════════════════════════════════════════ */

const MOCK_NODES: EdgeNode[] = [
  {
    id: "PI-KMD-001",
    location: "Kamand Valley Main Gate",
    status: "online",
    uptime_hours: 312,
    ram_usage_mb: 572,
    ram_pct: 28,
    cellular_signal: 4,
    last_heartbeat: "32s ago",
    firmware_version: "v2.1.4",
    total_captures_today: 486,
    breaches_today: 23,
    lat: 31.7754,
    lng: 76.9861,
  },
  {
    id: "PI-KMD-002",
    location: "North Campus Academic Block",
    status: "online",
    uptime_hours: 288,
    ram_usage_mb: 448,
    ram_pct: 22,
    cellular_signal: 3,
    last_heartbeat: "1m ago",
    firmware_version: "v2.1.4",
    total_captures_today: 391,
    breaches_today: 14,
    lat: 31.7768,
    lng: 76.9873,
  },
  {
    id: "PI-KMD-003",
    location: "South Campus Entry Curve",
    status: "offline",
    uptime_hours: 0,
    ram_usage_mb: 0,
    ram_pct: 0,
    cellular_signal: 0 as 1,
    last_heartbeat: "3h 14m ago",
    firmware_version: "v2.1.3",
    total_captures_today: 0,
    breaches_today: 0,
    lat: 31.7739,
    lng: 76.9848,
  },
  {
    id: "PI-KMD-004",
    location: "Hostel Zone Speed Breaker",
    status: "degraded",
    uptime_hours: 156,
    ram_usage_mb: 1124,
    ram_pct: 55,
    cellular_signal: 2,
    last_heartbeat: "4m ago",
    firmware_version: "v2.1.2",
    total_captures_today: 407,
    breaches_today: 10,
    lat: 31.7745,
    lng: 76.9855,
  },
];

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — BREACH EVENTS
   ═══════════════════════════════════════════════════════════════ */

const MOCK_BREACHES: BreachEvent[] = [
  {
    id: 3001,
    node_id: "PI-KMD-001",
    timestamp: "Today, 10:42:18 AM",
    radar_speed_kmh: 67,
    speed_limit_kmh: 40,
    overspeed_pct: 67.5,
    vehicle_class: "car",
    vehicle_confidence: 94,
    plate_text: "HP12AB3456",
    plate_confidence: 91,
    pce_weight: 1.0,
    status: "new",
  },
  {
    id: 3002,
    node_id: "PI-KMD-002",
    timestamp: "Today, 10:38:05 AM",
    radar_speed_kmh: 82,
    speed_limit_kmh: 50,
    overspeed_pct: 64.0,
    vehicle_class: "truck",
    vehicle_confidence: 88,
    plate_text: "HP06C7890",
    plate_confidence: 76,
    pce_weight: 3.5,
    status: "new",
  },
  {
    id: 3003,
    node_id: "PI-KMD-001",
    timestamp: "Today, 10:31:42 AM",
    radar_speed_kmh: 91,
    speed_limit_kmh: 40,
    overspeed_pct: 127.5,
    vehicle_class: "bus",
    vehicle_confidence: 96,
    plate_text: "HP34D1234",
    plate_confidence: 83,
    pce_weight: 3.0,
    status: "reviewed",
  },
  {
    id: 3004,
    node_id: "PI-KMD-004",
    timestamp: "Today, 10:27:19 AM",
    radar_speed_kmh: 58,
    speed_limit_kmh: 25,
    overspeed_pct: 132.0,
    vehicle_class: "motorcycle",
    vehicle_confidence: 79,
    plate_text: null,
    plate_confidence: null,
    pce_weight: 0.5,
    status: "new",
  },
  {
    id: 3005,
    node_id: "PI-KMD-002",
    timestamp: "Today, 10:22:54 AM",
    radar_speed_kmh: 73,
    speed_limit_kmh: 50,
    overspeed_pct: 46.0,
    vehicle_class: "car",
    vehicle_confidence: 97,
    plate_text: "HP12EF5678",
    plate_confidence: 95,
    pce_weight: 1.0,
    status: "exported",
  },
  {
    id: 3006,
    node_id: "PI-KMD-001",
    timestamp: "Today, 10:14:31 AM",
    radar_speed_kmh: 55,
    speed_limit_kmh: 40,
    overspeed_pct: 37.5,
    vehicle_class: "auto_rickshaw",
    vehicle_confidence: 72,
    plate_text: "HP99G0001",
    plate_confidence: 68,
    pce_weight: 1.5,
    status: "flagged",
  },
  {
    id: 3007,
    node_id: "PI-KMD-004",
    timestamp: "Today, 10:08:12 AM",
    radar_speed_kmh: 64,
    speed_limit_kmh: 25,
    overspeed_pct: 156.0,
    vehicle_class: "car",
    vehicle_confidence: 91,
    plate_text: "HR26DK8822",
    plate_confidence: 89,
    pce_weight: 1.0,
    status: "new",
  },
  {
    id: 3008,
    node_id: "PI-KMD-002",
    timestamp: "Today, 09:56:44 AM",
    radar_speed_kmh: 71,
    speed_limit_kmh: 50,
    overspeed_pct: 42.0,
    vehicle_class: "truck",
    vehicle_confidence: 85,
    plate_text: "PB10HJ4455",
    plate_confidence: 74,
    pce_weight: 3.5,
    status: "reviewed",
  },
];

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — VEHICLE STATISTICS
   ═══════════════════════════════════════════════════════════════ */

const MOCK_VEHICLE_STATS: VehicleStats[] = [
  { vehicle_class: "Car", count: 798, pce_total: 798, avg_speed: 44, breach_rate: 18.2 },
  { vehicle_class: "Bus", count: 189, pce_total: 567, avg_speed: 38, breach_rate: 12.7 },
  { vehicle_class: "Truck", count: 156, pce_total: 546, avg_speed: 35, breach_rate: 22.4 },
  { vehicle_class: "Motorcycle", count: 97, pce_total: 48.5, avg_speed: 48, breach_rate: 31.9 },
  { vehicle_class: "Auto Rickshaw", count: 44, pce_total: 66, avg_speed: 32, breach_rate: 6.8 },
];

const PIE_COLORS = ["#10b981", "#0ea5e9", "#a855f7", "#f59e0b", "#ef4444"];

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — V85 LOCATIONS
   ═══════════════════════════════════════════════════════════════ */

const MOCK_V85: V85Location[] = [
  {
    location: "Kamand Valley Main Gate",
    speed_limit: 40,
    v85_speed: 58,
    total_vehicles: 486,
    breach_count: 89,
    breach_rate: 18.3,
    hourly_data: [
      { hour: "00:00", v85: 42, count: 8, limit: 40 },
      { hour: "04:00", v85: 45, count: 12, limit: 40 },
      { hour: "08:00", v85: 62, count: 68, limit: 40 },
      { hour: "10:00", v85: 58, count: 74, limit: 40 },
      { hour: "12:00", v85: 55, count: 56, limit: 40 },
      { hour: "14:00", v85: 54, count: 48, limit: 40 },
      { hour: "16:00", v85: 61, count: 71, limit: 40 },
      { hour: "18:00", v85: 56, count: 65, limit: 40 },
      { hour: "20:00", v85: 48, count: 42, limit: 40 },
      { hour: "22:00", v85: 44, count: 24, limit: 40 },
    ],
  },
  {
    location: "North Campus Academic Block",
    speed_limit: 50,
    v85_speed: 64,
    total_vehicles: 391,
    breach_count: 54,
    breach_rate: 13.8,
    hourly_data: [
      { hour: "00:00", v85: 48, count: 5, limit: 50 },
      { hour: "04:00", v85: 50, count: 8, limit: 50 },
      { hour: "08:00", v85: 68, count: 52, limit: 50 },
      { hour: "10:00", v85: 64, count: 61, limit: 50 },
      { hour: "12:00", v85: 59, count: 45, limit: 50 },
      { hour: "14:00", v85: 57, count: 38, limit: 50 },
      { hour: "16:00", v85: 66, count: 58, limit: 50 },
      { hour: "18:00", v85: 62, count: 54, limit: 50 },
      { hour: "20:00", v85: 52, count: 35, limit: 50 },
      { hour: "22:00", v85: 49, count: 18, limit: 50 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — ACTIVE LEARNING QUEUE
   ═══════════════════════════════════════════════════════════════ */

const MOCK_AL_QUEUE: ALQueueItem[] = [
  { id: 5001, breach_id: 3004, predicted_class: "Motorcycle", confidence: 68, timestamp: "Today, 10:27 AM", status: "pending" },
  { id: 5002, breach_id: 3006, predicted_class: "Auto Rickshaw", confidence: 72, timestamp: "Today, 10:14 AM", status: "pending" },
  { id: 5003, breach_id: 3008, predicted_class: "Truck", confidence: 71, timestamp: "Today, 09:56 AM", status: "pending" },
  { id: 5004, breach_id: 3010, predicted_class: "Bus", confidence: 65, timestamp: "Today, 09:42 AM", status: "pending" },
  { id: 5005, breach_id: 3012, predicted_class: "Car", confidence: 74, timestamp: "Today, 09:31 AM", status: "pending" },
  { id: 5006, breach_id: 3015, predicted_class: "Truck", confidence: 62, timestamp: "Today, 09:18 AM", status: "approved" },
  { id: 5007, breach_id: 3017, predicted_class: "Motorcycle", confidence: 69, timestamp: "Today, 09:05 AM", status: "pending" },
  { id: 5008, breach_id: 3019, predicted_class: "Bus", confidence: 58, timestamp: "Today, 08:52 AM", status: "rejected" },
  { id: 5009, breach_id: 3021, predicted_class: "Car", confidence: 73, timestamp: "Today, 08:41 AM", status: "pending" },
  { id: 5010, breach_id: 3023, predicted_class: "Auto Rickshaw", confidence: 64, timestamp: "Today, 08:29 AM", status: "pending" },
  { id: 5011, breach_id: 3025, predicted_class: "Truck", confidence: 70, timestamp: "Today, 08:14 AM", status: "approved" },
  { id: 5012, breach_id: 3027, predicted_class: "Motorcycle", confidence: 66, timestamp: "Today, 08:01 AM", status: "pending" },
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function EnforcementPage() {
  const [nodes] = useState<EdgeNode[]>(MOCK_NODES);
  const [breaches, setBreaches] = useState<BreachEvent[]>(MOCK_BREACHES);
  const [alQueue, setAlQueue] = useState<ALQueueItem[]>(MOCK_AL_QUEUE);
  const [selectedBreach, setSelectedBreach] = useState<BreachEvent | null>(null);
  const [selectedV85, setSelectedV85] = useState<V85Location>(MOCK_V85[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Probe backend connection
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch("http://127.0.0.1:8000/healthz", { mode: "cors" });
        if (res.ok) setBackendConnected(true);
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
      /* keep state */
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleBreachStatus = (id: number, newStatus: BreachEvent["status"]) => {
    setBreaches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
  };

  const handleALAction = (id: number, action: "approved" | "rejected") => {
    setAlQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
  };

  // Derived stats
  const totalBreachesToday = MOCK_NODES.reduce((s, n) => s + n.breaches_today, 0);
  const activeNodes = MOCK_NODES.filter((n) => n.status !== "offline").length;
  const totalVehicles = MOCK_VEHICLE_STATS.reduce((s, v) => s + v.count, 0);
  const totalPlates = MOCK_BREACHES.filter((b) => b.plate_text !== null).length;
  const alPending = alQueue.filter((a) => a.status === "pending").length;

  // Filtered breaches
  const filteredBreaches = breaches.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (vehicleFilter !== "all" && b.vehicle_class !== vehicleFilter) return false;
    return true;
  });

  const getNodeStatusColor = (status: EdgeNode["status"]) => {
    switch (status) {
      case "online":
        return "bg-emerald-400 shadow-[0_0_8px_#10b981]";
      case "degraded":
        return "bg-amber-400 shadow-[0_0_8px_#f59e0b]";
      case "offline":
        return "bg-rose-400 shadow-[0_0_6px_#ef4444]";
    }
  };

  const getNodeStatusBadge = (status: EdgeNode["status"]) => {
    switch (status) {
      case "online":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
      case "degraded":
        return "bg-amber-950/60 text-amber-400 border-amber-800/60";
      case "offline":
        return "bg-rose-950/60 text-rose-400 border-rose-800/60";
    }
  };

  const getBreachStatusBadge = (status: BreachEvent["status"]) => {
    switch (status) {
      case "new":
        return "bg-rose-500/10 text-rose-400";
      case "reviewed":
        return "bg-amber-500/10 text-amber-400";
      case "exported":
        return "bg-emerald-500/10 text-emerald-400";
      case "flagged":
        return "bg-purple-500/10 text-purple-400";
    }
  };

  const getVehicleIcon = (cls: string) => {
    switch (cls) {
      case "car":
        return "🚗";
      case "bus":
        return "🚌";
      case "truck":
        return "🚛";
      case "motorcycle":
        return "🏍️";
      case "auto_rickshaw":
        return "🛺";
      default:
        return "🚗";
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return "text-emerald-400";
    if (conf >= 75) return "text-amber-400";
    return "text-rose-400";
  };

  const renderSignalBars = (strength: number) => {
    return (
      <div className="flex items-end gap-[2px] h-3.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "w-[3px] rounded-full transition-colors",
              level <= strength ? "bg-emerald-400" : "bg-zinc-700"
            )}
            style={{ height: `${20 + level * 16}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Edge Traffic Enforcement
              </h2>
              <p className="text-xs text-muted">
                Doppler radar speed breach detection, vehicle classification &amp; ALPR evidence
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                backendConnected
                  ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]"
                  : "bg-amber-400"
              )}
            />
            <span className="text-muted">
              Edge Backend:{" "}
              <strong className="text-foreground">
                {backendConnected ? "Connected" : "Mock Simulator"}
              </strong>
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-input border border-border rounded-lg text-xs font-medium text-foreground hover:bg-card-hover transition-colors"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── KPI CARDS ROW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Breaches */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              Breaches Today
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalBreachesToday}</span>
            <span className="text-xs text-rose-400 font-medium">+8 last hour</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Radar-confirmed speed violations</p>
        </div>

        {/* Active Nodes */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              Active Nodes
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {activeNodes}/{nodes.length}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {activeNodes === nodes.length ? "All online" : "1 offline"}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1">Raspberry Pi 4 edge nodes</p>
        </div>

        {/* Vehicles Classified */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              Vehicles Classified
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totalVehicles.toLocaleString()}
            </span>
            <span className="text-xs text-sky-400 font-medium">YOLOv8 pipeline</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Car, Bus, Truck, Motorcycle, Auto</p>
        </div>

        {/* Plates Recognized */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              Plates Read
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalPlates}</span>
            <span className="text-xs text-purple-400 font-medium">
              {Math.round((totalPlates / breaches.length) * 100)}% capture rate
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1">EasyOCR / PaddleOCR extraction</p>
        </div>

        {/* Avg Detection Latency */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              Avg Latency
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">340</span>
            <span className="text-xs text-muted font-medium">ms end-to-end</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Radar → Capture → POST → DB</p>
        </div>

        {/* AL Queue */}
        <div className="bg-card border border-border rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase font-medium tracking-wider">
              AL Queue
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{alPending}</span>
            <span className="text-xs text-orange-400 font-medium">pending review</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Confidence &lt;75% → human review</p>
        </div>
      </div>

      {/* ─── MAIN GRID: LIVE BREACH FEED + EVIDENCE DRAWER ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Breach Feed */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span>Live Speed Breach Feed</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/40 font-mono">
                  {filteredBreaches.length} events
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Real-time radar detections from edge nodes — click any row for evidence details
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="exported">Exported</option>
                <option value="flagged">Flagged</option>
              </select>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Vehicles</option>
                <option value="car">Car</option>
                <option value="bus">Bus</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="auto_rickshaw">Auto Rickshaw</option>
              </select>
            </div>
          </div>

          {/* Breach Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Over%</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Plate</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredBreaches.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBreach(b)}
                    className={cn(
                      "hover:bg-card-hover/30 transition-colors cursor-pointer",
                      selectedBreach?.id === b.id && "bg-card-hover/50"
                    )}
                  >
                    <td className="py-3 px-3 text-muted whitespace-nowrap">
                      {b.timestamp.replace("Today, ", "")}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {b.node_id.replace("PI-KMD-", "N")}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono font-bold text-foreground">
                          {b.radar_speed_kmh}
                        </span>
                        <span className="text-[10px] text-muted">
                          / {b.speed_limit_kmh}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "font-mono font-bold text-[11px]",
                          b.overspeed_pct > 100
                            ? "text-rose-400"
                            : b.overspeed_pct > 50
                            ? "text-amber-400"
                            : "text-yellow-400"
                        )}
                      >
                        +{b.overspeed_pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span>{getVehicleIcon(b.vehicle_class)}</span>
                        <span className="capitalize text-foreground text-[11px] font-medium">
                          {b.vehicle_class.replace("_", " ")}
                        </span>
                        <span className={cn("text-[10px] font-mono", getConfidenceColor(b.vehicle_confidence))}>
                          {b.vehicle_confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {b.plate_text ? (
                        <span className="font-mono text-[11px] font-semibold text-foreground bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">
                          {b.plate_text}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted italic">No plate</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                          getBreachStatusBadge(b.status)
                        )}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBreach(b);
                        }}
                        className="p-1.5 rounded-lg bg-input hover:bg-card-hover border border-border text-muted hover:text-foreground transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Evidence Viewer Drawer */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col space-y-4">
          {selectedBreach ? (
            <>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-xs font-mono text-rose-400 font-bold">
                    BREACH #{selectedBreach.id}
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Evidence Viewer
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBreach(null)}
                  className="p-1 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Capture Preview (Placeholder) */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                    <Car className="w-6 h-6 text-zinc-400" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    1080p CAPTURE — CAMERA MODULE 3
                  </span>
                </div>

                {/* Speed Overlay */}
                <div className="absolute top-3 left-3 bg-rose-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-bold font-mono shadow-lg">
                  {selectedBreach.radar_speed_kmh} km/h
                </div>

                {/* Limit Overlay */}
                <div className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-sm text-zinc-300 px-2 py-1 rounded-lg text-xs font-mono border border-zinc-700">
                  LIMIT: {selectedBreach.speed_limit_kmh}
                </div>

                {/* Timestamp Overlay */}
                <div className="absolute bottom-3 left-3 bg-zinc-900/80 backdrop-blur-sm text-zinc-400 px-2 py-1 rounded text-[10px] font-mono">
                  {selectedBreach.timestamp} • {selectedBreach.node_id}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-input/40 border border-border/60 text-center">
                  <span className="text-[10px] text-muted block uppercase">Radar Speed</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {selectedBreach.radar_speed_kmh}
                  </span>
                  <span className="text-[10px] text-muted block">km/h</span>
                </div>
                <div className="p-2.5 rounded-lg bg-input/40 border border-border/60 text-center">
                  <span className="text-[10px] text-muted block uppercase">Overspeed</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    +{selectedBreach.overspeed_pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-muted block">above limit</span>
                </div>
              </div>

              {/* Vehicle Classification */}
              <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-900/40 text-xs">
                <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-2">
                  <Car className="w-3.5 h-3.5" />
                  <span>Vehicle Classification (YOLOv8)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getVehicleIcon(selectedBreach.vehicle_class)}
                    </span>
                    <span className="capitalize font-semibold text-foreground">
                      {selectedBreach.vehicle_class.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted block">Confidence</span>
                    <span className={cn("font-mono font-bold", getConfidenceColor(selectedBreach.vehicle_confidence))}>
                      {selectedBreach.vehicle_confidence}%
                    </span>
                  </div>
                </div>
                {/* Confidence Bar */}
                <div className="mt-2 w-full h-1.5 rounded-full bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      selectedBreach.vehicle_confidence >= 90
                        ? "bg-emerald-400"
                        : selectedBreach.vehicle_confidence >= 75
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    )}
                    style={{ width: `${selectedBreach.vehicle_confidence}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-muted">
                  PCE Weight: <strong className="text-foreground">{selectedBreach.pce_weight}</strong>
                </div>
              </div>

              {/* ALPR Result */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-2">
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>License Plate Recognition</span>
                </div>
                {selectedBreach.plate_text ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 font-mono text-base font-bold text-foreground tracking-wider">
                        {selectedBreach.plate_text}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted block">OCR Confidence</span>
                        <span className={cn("font-mono font-bold", getConfidenceColor(selectedBreach.plate_confidence!))}>
                          {selectedBreach.plate_confidence}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-zinc-800">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          selectedBreach.plate_confidence! >= 90
                            ? "bg-emerald-400"
                            : selectedBreach.plate_confidence! >= 75
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        )}
                        style={{ width: `${selectedBreach.plate_confidence}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted p-2 bg-zinc-900/40 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Plate not detected — possible occlusion or angle issue</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => handleBreachStatus(selectedBreach.id, "reviewed")}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-input hover:bg-card-hover border border-border text-xs font-medium text-foreground transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Review
                </button>
                <button
                  onClick={() => handleBreachStatus(selectedBreach.id, "exported")}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => handleBreachStatus(selectedBreach.id, "flagged")}
                  className="flex items-center justify-center p-2 rounded-lg bg-input hover:bg-rose-950/40 text-muted hover:text-rose-400 border border-border transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-input/40 border border-border flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-muted/40" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                No Event Selected
              </h3>
              <p className="text-xs text-muted max-w-[200px]">
                Click any breach in the feed table to inspect radar data, captured evidence, and ALPR results
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── EDGE NODE FLEET ─── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Edge Node Fleet</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-input text-muted border border-border">
                {nodes.length} nodes
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Raspberry Pi 4 (2GB RAM) field units with 24GHz Doppler radar + Camera Module 3
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                "p-4 rounded-xl border transition-all",
                node.status === "offline"
                  ? "bg-rose-950/10 border-rose-900/30"
                  : node.status === "degraded"
                  ? "bg-amber-950/10 border-amber-900/30"
                  : "bg-input/20 border-border hover:border-primary/40"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full animate-pulse",
                      getNodeStatusColor(node.status)
                    )}
                  />
                  <span className="font-mono text-xs font-bold text-foreground">
                    {node.id}
                  </span>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase",
                    getNodeStatusBadge(node.status)
                  )}
                >
                  {node.status}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="w-3 h-3 text-muted flex-shrink-0" />
                <span className="text-xs text-foreground font-medium truncate">
                  {node.location}
                </span>
              </div>

              {/* RAM Usage Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted">RAM Usage</span>
                  <span className="text-foreground font-mono">
                    {node.status !== "offline"
                      ? `${node.ram_usage_mb}MB / 2048MB`
                      : "—"}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      node.ram_pct < 35
                        ? "bg-emerald-400"
                        : node.ram_pct < 55
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    )}
                    style={{ width: `${node.ram_pct}%` }}
                  />
                </div>
              </div>

              {/* Bottom Stats Row */}
              <div className="flex items-center justify-between text-[10px] text-muted">
                <div className="flex items-center gap-1.5">
                  {node.status !== "offline" ? (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-rose-400" />
                  )}
                  {renderSignalBars(node.status === "offline" ? 0 : node.cellular_signal)}
                </div>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {node.last_heartbeat}
                </span>
              </div>

              {/* Captures Today */}
              {node.status !== "offline" && (
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted">Captures</span>
                  <span className="font-mono font-bold text-foreground">
                    {node.total_captures_today}
                  </span>
                  <span className="text-muted">Breaches</span>
                  <span className="font-mono font-bold text-rose-400">
                    {node.breaches_today}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── VEHICLE ANALYTICS + V85 SPEED ANALYSIS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Distribution Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" />
                Vehicle Classification Distribution
              </h3>
              <p className="text-xs text-muted mt-0.5">
                YOLOv8 detections by type — breach rate overlay
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MOCK_VEHICLE_STATS}
                margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="vehicle_class"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#141415",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#fafafa",
                  }}
                  formatter={(value: any, name: any) => [
                    value,
                    name === "count" ? "Vehicles" : "Breach Rate %",
                  ]}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="breach_rate" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sky-500" />
              <span>Vehicle Count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Breach Rate (%)</span>
            </div>
          </div>
        </div>

        {/* PCE-Weighted Composition Pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                PCE-Weighted Traffic Composition
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Passenger Car Equivalent weighted volume share
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_VEHICLE_STATS}
                  dataKey="pce_total"
                  nameKey="vehicle_class"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {MOCK_VEHICLE_STATS.map((entry, index) => (
                    <Cell
                      key={entry.vehicle_class}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#141415",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#fafafa",
                  }}
                  formatter={(value: any) => [`${value} PCE`, "Volume"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* PCE Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted">
            {MOCK_VEHICLE_STATS.map((v, i) => (
              <div key={v.vehicle_class} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i] }}
                />
                <span>
                  {v.vehicle_class} ({v.pce_total} PCE)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── V85 SPEED ANALYSIS ─── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>V85 Percentile Speed Analysis</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              85th-percentile speed profile per enforcement location — dashed line = posted limit
            </p>
          </div>

          <div className="flex items-center gap-1 bg-input border border-border rounded-lg p-0.5 text-xs">
            {MOCK_V85.map((loc) => (
              <button
                key={loc.location}
                onClick={() => setSelectedV85(loc)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors text-[11px]",
                  selectedV85.location === loc.location
                    ? "bg-primary text-black shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {loc.location.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>

        {/* V85 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-input/40 border border-border/60 text-center">
            <span className="text-[10px] text-muted block uppercase">V85 Speed</span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {selectedV85.v85_speed}
            </span>
            <span className="text-[10px] text-muted block">km/h</span>
          </div>
          <div className="p-3 rounded-lg bg-input/40 border border-border/60 text-center">
            <span className="text-[10px] text-muted block uppercase">Speed Limit</span>
            <span className="text-xl font-bold text-foreground font-mono">
              {selectedV85.speed_limit}
            </span>
            <span className="text-[10px] text-muted block">km/h</span>
          </div>
          <div className="p-3 rounded-lg bg-input/40 border border-border/60 text-center">
            <span className="text-[10px] text-muted block uppercase">Total Vehicles</span>
            <span className="text-xl font-bold text-sky-400 font-mono">
              {selectedV85.total_vehicles}
            </span>
            <span className="text-[10px] text-muted block">today</span>
          </div>
          <div className="p-3 rounded-lg bg-input/40 border border-border/60 text-center">
            <span className="text-[10px] text-muted block uppercase">Breach Rate</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {selectedV85.breach_rate}%
            </span>
            <span className="text-[10px] text-muted block">
              {selectedV85.breach_count} violations
            </span>
          </div>
        </div>

        {/* V85 Area Chart */}
        <div className="h-52 w-full bg-input/20 border border-border/60 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={selectedV85.hourly_data}
              margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="v85Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="countGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 90]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141415",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#fafafa",
                }}
              />
              <ReferenceLine
                y={selectedV85.speed_limit}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{
                  value: `Limit: ${selectedV85.speed_limit}`,
                  position: "insideTopRight",
                  fill: "#ef4444",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="v85"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#v85Gradient)"
                name="V85 Speed"
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#countGradient)"
                name="Vehicle Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-rose-500 rounded" />
            <span>V85 Speed (km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-sky-500 rounded" />
            <span>Vehicle Count</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0 border-t border-dashed border-rose-500" style={{ width: 20 }} />
            <span>Posted Speed Limit</span>
          </div>
        </div>
      </div>

      {/* ─── ACTIVE LEARNING QUEUE ─── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-400" />
              <span>Active Learning Queue</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-400 border border-orange-800/40 font-mono">
                {alPending} pending
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Low-confidence predictions (&lt;75%) routed for human verification — approve to add to training set
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Preview</th>
                <th className="py-2.5 px-3">Predicted Class</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Breach ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {alQueue.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-card-hover/30 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="w-12 h-8 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center">
                      <Car className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {getVehicleIcon(item.predicted_class.toLowerCase().replace(" ", "_"))}
                      {item.predicted_class}
                      <span className="text-[10px] text-muted font-normal">?</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.confidence >= 70
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          )}
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[11px] font-bold",
                          item.confidence >= 70
                            ? "text-amber-400"
                            : "text-rose-400"
                        )}
                      >
                        {item.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-muted text-[11px]">
                    #{item.breach_id}
                  </td>
                  <td className="py-3 px-3 text-muted">
                    {item.timestamp.replace("Today, ", "")}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                        item.status === "pending"
                          ? "bg-orange-500/10 text-orange-400"
                          : item.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {item.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleALAction(item.id, "approved")}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-800/40 transition-colors"
                          title="Approve — add to training set"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleALAction(item.id, "rejected")}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-800/40 transition-colors"
                          title="Reject — misclassification"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted italic">
                        {item.status === "approved" ? "✓ Added to dataset" : "✗ Discarded"}
                      </span>
                    )}
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
