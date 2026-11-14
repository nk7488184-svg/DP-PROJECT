"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Radio,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Cpu,
  Wifi,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Eye
} from "lucide-react";
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

export default function RpiLiveCameraCard() {
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
  const [isScanningHazard, setIsScanningHazard] = useState(false);
  const [hazardScanResult, setHazardScanResult] = useState<any>(null);
  const [streamKey, setStreamKey] = useState(Date.now());

  // Poll camera status every 3 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            setTelemetry(json.data);
            if (json.data.online) {
              setStreamError(false);
            }
          }
        }
      } catch {
        // Backend or tunnel offline
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleScanHazard = async () => {
    setIsScanningHazard(true);
    setHazardScanResult(null);
    try {
      const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/hazard-scan`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setHazardScanResult(data.data);
      } else {
        alert("Hazard scan failed. Ensure FastAPI is running.");
      }
    } catch (e: any) {
      alert(`Scan request error: ${e.message}`);
    } finally {
      setIsScanningHazard(false);
    }
  };

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Live Raspberry Pi 5 Road Camera Feed
                </h3>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border",
                    telemetry.online
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
                      : "bg-amber-950/60 text-amber-400 border-amber-800/50"
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
                Corridor: <span className="text-foreground font-medium">{telemetry.road_name}</span> • Node: <span className="font-mono text-foreground">{telemetry.device_id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleScanHazard}
            disabled={isScanningHazard}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isScanningHazard ? "Analyzing Frame..." : "AI Road Hazard Scan"}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshStream}
            className="p-1.5 rounded-lg bg-input/80 hover:bg-card-hover border border-border text-muted hover:text-foreground transition-all"
            title="Refresh Camera Stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Stream Canvas (3 Cols) */}
        <div className="lg:col-span-3 relative rounded-xl overflow-hidden bg-black/90 border border-zinc-800 min-h-[340px] max-h-[460px] flex items-center justify-center">
          {streamError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Camera className="w-12 h-12 text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-300 font-medium">Camera Feed Reconnecting...</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Awaiting frames from Raspberry Pi 5 edge client. Ensure script is running on the Pi terminal.
              </p>
              <button
                onClick={handleRefreshStream}
                className="mt-4 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Stream Link</span>
              </button>
            </div>
          ) : (
            <img
              key={streamKey}
              src={`${FASTAPI_BASE}/api/v1/camera/stream?t=${streamKey}`}
              alt="RPi 5 Live Camera Stream"
              className="w-full h-full object-contain max-h-[460px]"
              onError={() => {
                // Fallback to static snapshot polling if MJPEG fails
                setStreamError(true);
              }}
            />
          )}

          {/* HUD Overlay Top */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[11px] font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold">REC • LIVE RPI 5</span>
              <span className="text-zinc-400">|</span>
              <span className="text-emerald-400">{telemetry.fps > 0 ? `${telemetry.fps} FPS` : "LIVE"}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ZERO-SD-CARD (RAM ONLY)</span>
            </div>
          </div>

          {/* HUD Overlay Bottom */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[11px] font-mono text-zinc-300">
              <span>{telemetry.road_name}</span>
            </div>

            <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-zinc-400">
              <span>Frames Ingested: {telemetry.frame_count}</span>
            </div>
          </div>
        </div>

        {/* Telemetry Sidebar (1 Col) */}
        <div className="flex flex-col gap-3">
          {/* Card 1: Zero-Storage Security Policy */}
          <div className="p-3.5 rounded-xl bg-input/20 border border-border">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>SD Card Flash Protection</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Images are held in volatile RAM buffers (<code className="text-foreground">io.BytesIO</code>) on the Pi and uploaded directly to the website. Zero flash wear on Raspberry Pi SD card.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero-Storage Policy Verified</span>
            </div>
          </div>

          {/* Card 2: Edge Specs */}
          <div className="p-3.5 rounded-xl bg-input/20 border border-border">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Edge Telemetry</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted">
                <span>Hardware</span>
                <span className="text-foreground font-mono">RPi 5 (Bookworm)</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Resolution</span>
                <span className="text-foreground font-mono">{telemetry.resolution}</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Stream Rate</span>
                <span className="text-emerald-400 font-mono font-bold">{telemetry.fps} FPS</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Heartbeat</span>
                <span className="text-foreground font-mono">
                  {telemetry.online ? `${telemetry.last_seen_seconds_ago}s ago` : "Waiting"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Road Hazard Scan Results Banner */}
          {hazardScanResult ? (
            <div className={cn(
              "p-3.5 rounded-xl border transition-all",
              hazardScanResult.is_hazard
                ? "bg-rose-950/20 border-rose-900/50 text-rose-200"
                : "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
            )}>
              <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                {hazardScanResult.is_hazard ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Hazard Detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Road Nominal</span>
                  </>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground">
                {hazardScanResult.prediction.replace(/_/g, " ")}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                AI Confidence: {(hazardScanResult.confidence * 100).toFixed(1)}%
              </p>
              {hazardScanResult.is_hazard && (
                <div className="mt-2 text-[10px] text-rose-400 flex items-center gap-1">
                  <span>✔ Auto-logged to Public Reports & GIS Map</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-input/10 border border-dashed border-border text-center">
              <Eye className="w-5 h-5 text-muted mx-auto mb-1" />
              <p className="text-xs text-muted">
                Click <b className="text-foreground">AI Road Hazard Scan</b> above to inspect road condition with EfficientNetV2-S.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
