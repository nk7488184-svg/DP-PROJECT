"use client";

import { useState, useEffect } from "react";
import {
  Camera,
  Radio,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Cpu,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Eye,
  X,
  Filter,
  ExternalLink,
  Clock,
  MapPin,
  Car,
  Layers,
  BarChart2,
  FileImage,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { FASTAPI_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CameraTelemetry {
  online: boolean;
  device_id: string;
  road_name: string;
  fps: number;
  frame_count: number;
  last_seen_seconds_ago: number;
  resolution: string;
  storage_mode: string;
}

interface OverspeedPhoto {
  breach_id: string;
  timestamp: string;
  speed_kmh: number;
  posted_limit_kmh: number;
  delta_over_limit: number;
  license_plate: string;
  vehicle_type: string;
  ocr_confidence: number;
  image_url: string;
  device_id: string;
  road_name: string;
  severity: "low" | "moderate" | "high" | "critical";
}

interface AnalyticsPhoto {
  id: string;
  timestamp: string;
  image_url: string;
  road_condition: string;
  condition_confidence: number;
  flow_rate_vph: number;
  road_density_pct: number;
  device_id: string;
  road_name: string;
  corridor: string;
  storage_mode: string;
}

export default function CameraEvidencePage() {
  const [telemetry, setTelemetry] = useState<CameraTelemetry>({
    online: false,
    device_id: "RPI4_CAMERA_UNIT_01",
    road_name: "Behind A11 on New Construction Road",
    fps: 0,
    frame_count: 0,
    last_seen_seconds_ago: 999,
    resolution: "1280x720",
    storage_mode: "Zero-Storage (In-Memory Streaming)"
  });

  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "overspeed" | "analytics">("all");

  const [overspeedPhotos, setOverspeedPhotos] = useState<OverspeedPhoto[]>([]);
  const [analyticsPhotos, setAnalyticsPhotos] = useState<AnalyticsPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isTriggeringBreach, setIsTriggeringBreach] = useState(false);
  const [isCapturingAnalytics, setIsCapturingAnalytics] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Poll camera status & fetch photos
  const fetchCameraData = async () => {
    try {
      // 1. Camera Status
      const statusRes = await fetch(`${FASTAPI_BASE}/api/v1/camera/status`);
      if (statusRes.ok) {
        const json = await statusRes.json();
        if (json.success) {
          setTelemetry(json.data);
          if (json.data.online) setStreamError(false);
        }
      }

      // 2. Overspeeding Photos
      const overspeedRes = await fetch(`${FASTAPI_BASE}/api/v1/camera/photos/overspeed?limit=30`);
      if (overspeedRes.ok) {
        const json = await overspeedRes.json();
        if (json.success) setOverspeedPhotos(json.data);
      }

      // 3. Analytics Photos
      const analyticsRes = await fetch(`${FASTAPI_BASE}/api/v1/camera/photos/analytics?limit=30`);
      if (analyticsRes.ok) {
        const json = await analyticsRes.json();
        if (json.success) setAnalyticsPhotos(json.data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    fetchCameraData();
    const interval = setInterval(fetchCameraData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
    fetchCameraData();
  };

  // Trigger manual overspeed vehicle test
  const handleTriggerOverspeed = async () => {
    setIsTriggeringBreach(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/trigger-overspeed`, {
        method: "POST"
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        setActionSuccessMsg(`Overspeeding vehicle snapped (${data.speed_kmh} km/h). ML detected plate: ${data.license_plate}!`);
        fetchCameraData();
      } else {
        alert("Failed to trigger overspeed capture. Verify FastAPI is online.");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsTriggeringBreach(false);
    }
  };

  // Trigger manual analytics photo capture
  const handleCaptureAnalytics = async () => {
    setIsCapturingAnalytics(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/capture-analytics`, {
        method: "POST"
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.data;
        setActionSuccessMsg(`Analytics photo captured! AI condition: ${item.road_condition} (${item.condition_confidence}%).`);
        fetchCameraData();
      } else {
        alert("Failed to capture analytics photo.");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsCapturingAnalytics(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-rose-950/70 text-rose-400 border-rose-800/40";
      case "high":
        return "bg-orange-950/70 text-orange-400 border-orange-800/40";
      case "moderate":
        return "bg-amber-950/70 text-amber-400 border-amber-800/40";
      default:
        return "bg-emerald-950/70 text-emerald-400 border-emerald-800/40";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Corridor Vision System
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-input text-muted border border-border font-mono">
              Zero-Storage Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Live Camera Feed & Visual Evidence Hub
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time RPi 5 camera stream, overspeeding vehicle photo captures, and road analytics imagery at{" "}
            <span className="text-foreground font-medium">Behind A11 on New Construction Road</span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerOverspeed}
            disabled={isTriggeringBreach}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTriggeringBreach ? "Snapping..." : "📸 Trigger Overspeed Snapshot"}</span>
          </button>

          <button
            type="button"
            onClick={handleCaptureAnalytics}
            disabled={isCapturingAnalytics}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isCapturingAnalytics ? "Capturing..." : "📊 Capture Analytics Photo"}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshStream}
            className="p-2 rounded-xl bg-input border border-border text-muted hover:text-foreground transition-all"
            title="Refresh feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success alert notice */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── SECTION 1: LIVE RPI 5 CAMERA STREAM ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Live Raspberry Pi 5 Corridor Camera
                </h2>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border",
                    telemetry.online
                      ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/50"
                      : "bg-amber-950/70 text-amber-400 border-amber-800/50"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      telemetry.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )}
                  />
                  {telemetry.online ? "Live Feed Streaming" : "Standby / Waiting"}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Node ID: <span className="font-mono text-foreground">{telemetry.device_id}</span> • Corridor: <span className="text-foreground">{telemetry.road_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
              {telemetry.fps > 0 ? `${telemetry.fps} FPS` : "STREAM ACTIVE"}
            </span>
            <span className="font-mono text-zinc-300 bg-input border border-border px-2.5 py-1 rounded-lg">
              {telemetry.resolution}
            </span>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 min-h-[360px] max-h-[500px] flex items-center justify-center shadow-2xl">
          {streamError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-white">
              <Camera className="w-12 h-12 text-zinc-600 mb-2" />
              <p className="text-sm font-semibold">RPi 5 Camera Feed Reconnecting...</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Awaiting frame packets from Raspberry Pi 5 edge streamer. Verify edge client is running.
              </p>
              <button
                onClick={handleRefreshStream}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <img
              key={streamKey}
              src={`${FASTAPI_BASE}/api/v1/camera/stream${streamKey > 0 ? `?t=${streamKey}` : ""}`}
              alt="RPi 5 Live Video Feed"
              className="w-full h-full object-contain max-h-[500px]"
              onError={() => setStreamError(true)}
            />
          )}

          {/* Top HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold">REC • LIVE RPI 5 CAMERA</span>
              <span className="text-zinc-500">|</span>
              <span className="text-emerald-400 font-bold">{telemetry.fps} FPS</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ZERO-SD-CARD (PURE RAM BUFFER)</span>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-xs font-mono text-zinc-300">
              <span>{telemetry.road_name}</span>
            </div>

            <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-[11px] font-mono text-zinc-400">
              <span>Total Ingested: {telemetry.frame_count} frames</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: PHOTOS FILTER BAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 bg-input/80 border border-border p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "all"
                ? "bg-primary text-black shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Captured Photos ({overspeedPhotos.length + analyticsPhotos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overspeed")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "overspeed"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🚨 Overspeeding Vehicle Photos ({overspeedPhotos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "analytics"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>📊 Photos for Analytics ({analyticsPhotos.length})</span>
          </button>
        </div>

        {/* Note pointing to Enforcement Menu */}
        <Link
          href="/dashboard/enforcement"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          <span>View Recognized Number Plates in Traffic Enforcement Menu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── SECTION 3: PHOTO GALLERIES ─── */}

      {/* (A) OVERSPEEDING VEHICLE PHOTOS GALLERY */}
      {(activeTab === "all" || activeTab === "overspeed") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-500" />
                <span>Overspeeding Vehicle Photos (Camera Captures)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/40 font-mono">
                  {overspeedPhotos.length} photos
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Exact camera snapshots snapped upon radar speed breach exceeding 20.0 km/h limit.
              </p>
            </div>
          </div>

          {overspeedPhotos.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center text-muted">
              <FileImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No overspeeding vehicle photos recorded yet.</p>
              <button
                onClick={handleTriggerOverspeed}
                className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Click to Trigger Test Snapshot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {overspeedPhotos.map((photo) => {
                const imgFullUrl = photo.image_url?.startsWith("http")
                  ? photo.image_url
                  : `${FASTAPI_BASE}${photo.image_url}`;

                return (
                  <div
                    key={photo.breach_id}
                    onClick={() => setSelectedPhoto({ ...photo, type: "overspeed" })}
                    className="group bg-card border border-border hover:border-rose-500/50 rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-black/80 overflow-hidden">
                      <img
                        src={imgFullUrl}
                        alt={`Breach ${photo.breach_id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.src = `${FASTAPI_BASE}/api/v1/camera/live`;
                        }}
                      />
                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 text-rose-400 font-bold border border-rose-500/30">
                          {photo.speed_kmh} km/h
                        </span>
                        <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border", getSeverityBadge(photo.severity))}>
                          +{photo.delta_over_limit} km/h
                        </span>
                      </div>

                      {/* Bottom Overlay Plate */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-mono font-bold bg-black/80 text-white px-2 py-0.5 rounded">
                          {photo.vehicle_type}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500 text-black px-2 py-0.5 rounded">
                          {photo.license_plate}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-3 text-xs flex flex-col justify-between flex-1">
                      <div className="flex items-center justify-between text-muted mb-1">
                        <span className="font-mono text-[10px]">{photo.breach_id}</span>
                        <span className="text-[10px]" suppressHydrationWarning>{new Date(photo.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                        <span className="text-muted truncate max-w-[130px]">{photo.road_name}</span>
                        <span className="text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                          <span>Inspect</span>
                          <Maximize2 className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* (B) PHOTOS FOR ANALYTICS GALLERY */}
      {(activeTab === "all" || activeTab === "analytics") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
                <span>Photos Captured for Traffic & Road Analytics</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                  {analyticsPhotos.length} photos
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Periodic high-resolution snapshots evaluating surface condition, vehicle volume, and flow rates.
              </p>
            </div>
          </div>

          {analyticsPhotos.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center text-muted">
              <FileImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No analytics photos captured yet.</p>
              <button
                onClick={handleCaptureAnalytics}
                className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                Click to Capture Analytics Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {analyticsPhotos.map((photo) => {
                const imgFullUrl = photo.image_url?.startsWith("http")
                  ? photo.image_url
                  : `${FASTAPI_BASE}${photo.image_url}`;

                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto({ ...photo, type: "analytics" })}
                    className="group bg-card border border-border hover:border-emerald-500/50 rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-black/80 overflow-hidden">
                      <img
                        src={imgFullUrl}
                        alt={`Analytics ${photo.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.src = `${FASTAPI_BASE}/api/v1/camera/live`;
                        }}
                      />
                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 text-emerald-400 font-bold border border-emerald-500/30">
                          {photo.flow_rate_vph} VPH
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-zinc-300 border border-zinc-700">
                          Density: {photo.road_density_pct}%
                        </span>
                      </div>

                      {/* Bottom Condition Badge */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded truncate max-w-[180px]",
                            photo.road_condition.toLowerCase().includes("normal")
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-600 text-white"
                          )}
                        >
                          {photo.road_condition}
                        </span>
                        <span className="text-[10px] font-mono bg-black/80 text-zinc-300 px-1.5 py-0.5 rounded">
                          {photo.condition_confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-3 text-xs flex flex-col justify-between flex-1">
                      <div className="flex items-center justify-between text-muted mb-1">
                        <span className="font-mono text-[10px]">{photo.id}</span>
                        <span className="text-[10px]" suppressHydrationWarning>{new Date(photo.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                        <span className="text-muted truncate max-w-[130px]">{photo.road_name}</span>
                        <span className="text-emerald-400 font-semibold group-hover:underline flex items-center gap-0.5">
                          <span>Inspect</span>
                          <Maximize2 className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: FULL PHOTO INSPECTION VIEWER ─── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-primary">
                  {selectedPhoto.type === "overspeed" ? `OVERSPEED BREACH #${selectedPhoto.breach_id}` : `ANALYTICS CAPTURE #${selectedPhoto.id}`}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {selectedPhoto.type === "overspeed" ? "Vehicle Visual Evidence Snapshot" : "Road Surface & Telemetry Analysis"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-lg bg-input hover:bg-card-hover text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Big Image View */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <img
                src={
                  selectedPhoto.image_url?.startsWith("http")
                    ? selectedPhoto.image_url
                    : `${FASTAPI_BASE}${selectedPhoto.image_url}`
                }
                alt="Captured Evidence"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata Footer */}
            <div className="p-4 bg-input/20 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {selectedPhoto.type === "overspeed" ? (
                <>
                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Radar Speed</span>
                    <span className="text-base font-bold text-rose-400 font-mono">
                      {selectedPhoto.speed_kmh} km/h
                    </span>
                    <span className="text-[10px] text-muted block">Limit: {selectedPhoto.posted_limit_kmh} km/h</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Recognized Plate</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {selectedPhoto.license_plate}
                    </span>
                    <span className="text-[10px] text-muted block">OCR: {selectedPhoto.ocr_confidence}%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Vehicle Class</span>
                    <span className="text-base font-bold text-foreground">
                      {selectedPhoto.vehicle_type}
                    </span>
                    <span className="text-[10px] text-muted block capitalize">{selectedPhoto.severity} severity</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center flex flex-col justify-center">
                    <Link
                      href="/dashboard/enforcement"
                      className="px-2.5 py-1.5 bg-primary text-black rounded-lg font-bold text-xs hover:bg-primary/90 flex items-center justify-center gap-1"
                    >
                      <span>Enforcement Menu</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Road Condition</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {selectedPhoto.road_condition}
                    </span>
                    <span className="text-[10px] text-muted block">Conf: {selectedPhoto.condition_confidence}%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Corridor Flow</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {selectedPhoto.flow_rate_vph}
                    </span>
                    <span className="text-[10px] text-muted block">Vehicles / Hour</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Road Density</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {selectedPhoto.road_density_pct}%
                    </span>
                    <span className="text-[10px] text-muted block">Civil Occupancy</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-input/40 border border-border text-center">
                    <span className="text-[10px] text-muted block uppercase">Timestamp</span>
                    <span className="text-xs font-mono text-zinc-300 block" suppressHydrationWarning>
                      {new Date(selectedPhoto.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-muted block">Behind A11</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
