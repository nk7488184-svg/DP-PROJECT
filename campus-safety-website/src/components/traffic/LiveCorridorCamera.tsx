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
  ShieldCheck,
  Eye,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { FASTAPI_BASE } from "@/lib/api";

interface CameraTelemetry {
  online: boolean;
  device_id: string;
  road_name: string;
  fps: number;
  frame_count: number;
  last_seen_seconds_ago: number;
  resolution: string;
}

export default function LiveCorridorCamera() {
  const [telemetry, setTelemetry] = useState<CameraTelemetry>({
    online: false,
    device_id: "RPI4_CAMERA_UNIT_01",
    road_name: "Behind A11 on New Construction Road",
    fps: 0,
    frame_count: 0,
    last_seen_seconds_ago: 999,
    resolution: "1280x720"
  });

  const [streamError, setStreamError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [streamKey, setStreamKey] = useState(Date.now());

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && active) {
            setTelemetry(json.data);
            if (json.data.online) setStreamError(false);
          }
        }
      } catch {
        // Fallback or tunnel offline
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleScanHazard = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`${FASTAPI_BASE}/api/v1/camera/hazard-scan`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data.data);
      } else {
        alert("Road hazard scan failed. Verify FastAPI server is running.");
      }
    } catch (e: any) {
      alert(`Scan request error: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">
                Roadside RPi 5 Live Camera & Road Condition Stream
              </h3>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  telemetry.online
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    telemetry.online ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {telemetry.online ? "Live Feed Streaming" : "Standby / Waiting"}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Corridor: <b className="text-foreground">{telemetry.road_name}</b> (IIT Mandi) • Zero-SD Card Storage Architecture
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleScanHazard}
            disabled={isScanning}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isScanning ? "Scanning with AI..." : "Scan Road Hazard Now"}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshStream}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-muted hover:text-foreground transition-all"
            title="Refresh stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Stream & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Window (2 Cols) */}
        <div className="lg:col-span-2 relative rounded-xl overflow-hidden bg-black min-h-[320px] max-h-[440px] flex items-center justify-center border border-gray-200 shadow-inner">
          {streamError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-white">
              <Camera className="w-12 h-12 text-zinc-500 mb-2" />
              <p className="text-sm font-semibold">RPi 5 Camera Feed Reconnecting...</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Waiting for in-memory stream from Raspberry Pi. Ensure the edge streaming script is active.
              </p>
              <button
                onClick={handleRefreshStream}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Stream</span>
              </button>
            </div>
          ) : (
            <img
              key={streamKey}
              src={`${FASTAPI_BASE}/api/v1/camera/stream?t=${streamKey}`}
              alt="RPi 5 Road Camera Feed"
              className="w-full h-full object-contain max-h-[440px]"
              onError={() => setStreamError(true)}
            />
          )}

          {/* Top HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold">LIVE RPI 5 CAMERA</span>
              <span className="text-zinc-400">|</span>
              <span className="text-emerald-400">{telemetry.fps > 0 ? `${telemetry.fps} FPS` : "ONLINE"}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ZERO-SD-CARD (RAM BUFFER)</span>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-300">
              <span>{telemetry.road_name}</span>
            </div>

            <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-400">
              <span>Frames: {telemetry.frame_count}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Info (1 Col) */}
        <div className="flex flex-col gap-4 justify-between">
          {/* Card 1: Zero Storage Flash Protection Guarantee */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1.5">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>SD Card Flash Protection</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All camera captures operate in physical RAM (<code className="text-gray-800 font-mono">io.BytesIO</code>) on the Raspberry Pi and are streamed directly to this website. No disk writes occur on the edge node.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero-Storage Policy Enforced</span>
            </div>
          </div>

          {/* Card 2: AI Hazard Scan Banner */}
          {scanResult ? (
            <div className={`p-4 rounded-xl border ${
              scanResult.is_hazard
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                {scanResult.is_hazard ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Hazard Identified by AI</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Road Surface Clear</span>
                  </>
                )}
              </div>
              <p className="text-sm font-bold text-foreground">
                {scanResult.prediction.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Model Confidence: {(scanResult.confidence * 100).toFixed(1)}% (EfficientNetV2-S)
              </p>
              {scanResult.is_hazard && (
                <div className="mt-3 pt-2 border-t border-rose-200/60 flex items-center justify-between text-xs">
                  <span className="text-rose-700 font-medium">Logged to Campus Reports</span>
                  <Link
                    href="/report"
                    className="font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
                  >
                    <span>View / Edit</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
              <Eye className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-muted">
                Click <b className="text-foreground">Scan Road Hazard Now</b> to run real-time AI classification on the current roadside camera feed.
              </p>
            </div>
          )}

          {/* Card 3: Link to Public Hazard Report Form */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Notice a Road Defect?</p>
              <p className="text-[11px] text-muted">Report potholes or cracks directly</p>
            </div>
            <Link
              href="/report"
              className="px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Report Hazard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
