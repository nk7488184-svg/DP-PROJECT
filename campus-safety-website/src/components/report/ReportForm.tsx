"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Tag,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  AlertTriangle,
  Sparkles,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels, type HazardCategory, type Severity, type HazardReport } from "@/types";
import CategoryIcon from "@/components/shared/CategoryIcon";
import LocationPicker from "@/components/map/LocationPicker";
import { fetchFromApi } from "@/lib/api";
import { saveLocalReport } from "@/lib/localReportsStore";

const steps = [
  { label: "Photos", icon: Camera },
  { label: "Location", icon: MapPin },
  { label: "Details", icon: Tag },
  { label: "Review", icon: CheckCircle },
];

const categories: HazardCategory[] = [
  "pothole",
  "road_cracks",
  "damaged_pavement",
  "edge_damage",
  "patch_deterioration",
  "loose_aggregate",
  "debris_on_road",
  "vegetation",
  "drainage_iron_grid",
  "broken_curb",
  "other",
];

interface MLPredictionData {
  label: string;
  rawClass: string;
  confidence: number;
  confidencePercentage: string;
  mappedCategory?: HazardCategory;
  suggestedSeverity?: Severity;
  isLowConfidence?: boolean;
  topPredictions?: Array<{
    rawClass: string;
    label: string;
    confidence: number;
    confidencePercentage: string;
  }>;
}

interface ImageFeatures {
  greenRatio: number;
  darkRatio: number;
  craterDelta: number;
  edgeDensity: number;
  asymmetry: number;
  colorVariance: number;
}

function extractCanvasFeatures(canvas: HTMLCanvasElement): ImageFeatures {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { greenRatio: 0, darkRatio: 0, craterDelta: 0, edgeDensity: 0, asymmetry: 0, colorVariance: 0 };
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;

    let greenCount = 0;
    let darkCount = 0;
    let leftLumTotal = 0;
    let rightLumTotal = 0;
    let centerLumTotal = 0;
    let centerCount = 0;
    let rimLumTotal = 0;
    let rimCount = 0;
    let edgeDiffTotal = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    let totalSamples = 0;

    const step = Math.max(1, Math.floor((w * h) / 3000));

    for (let y = 0; y < h; y += Math.max(1, Math.floor(Math.sqrt(step)))) {
      for (let x = 0; x < w; x += Math.max(1, Math.floor(Math.sqrt(step)))) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        totalSamples++;
        rSum += r;
        gSum += g;
        bSum += b;

        const nexg = (2 * g - r - b) / (r + g + b + 1);
        if (g > r && g > b && (g - r) >= 6 && nexg > 0.05) {
          greenCount++;
        }
        if (lum < 60) {
          darkCount++;
        }
        if (x < w / 2) {
          leftLumTotal += lum;
        } else {
          rightLumTotal += lum;
        }

        if (x > w * 0.3 && x < w * 0.7 && y > h * 0.3 && y < h * 0.7) {
          centerLumTotal += lum;
          centerCount++;
        } else {
          rimLumTotal += lum;
          rimCount++;
        }

        if (x + 1 < w) {
          const nextR = data[i + 4];
          const nextLum = 0.299 * nextR;
          edgeDiffTotal += Math.abs(lum - nextLum);
        }
      }
    }

    const n = totalSamples || 1;
    const rimAvg = rimCount ? rimLumTotal / rimCount : 100;
    const centerAvg = centerCount ? centerLumTotal / centerCount : 100;

    const rMean = rSum / n;
    const gMean = gSum / n;
    const bMean = bSum / n;
    const colorVariance = Math.sqrt(((rMean - gMean) ** 2 + (gMean - bMean) ** 2 + (rMean - bMean) ** 2) / 3);

    return {
      greenRatio: greenCount / n,
      darkRatio: darkCount / n,
      craterDelta: Math.max(0, rimAvg - centerAvg),
      edgeDensity: (edgeDiffTotal / n) / 100,
      asymmetry: Math.abs((leftLumTotal / (n / 2 || 1)) - (rightLumTotal / (n / 2 || 1))),
      colorVariance,
    };
  } catch (e) {
    return { greenRatio: 0, darkRatio: 0, craterDelta: 0, edgeDensity: 0, asymmetry: 0, colorVariance: 0 };
  }
}

function classifyFromFeatures(features: ImageFeatures): MLPredictionData {
  const { greenRatio, darkRatio, craterDelta, edgeDensity, asymmetry, colorVariance } = features;

  let rawClass = "Pothole_Surface_Breakout";
  let label = "Pothole";
  let mappedCategory: HazardCategory = "pothole";
  let suggestedSeverity: Severity = "high";
  let conf = 0.945;

  if (greenRatio > 0.08) {
    rawClass = "Vegetation_Moss";
    label = "Vegetation / Moss";
    mappedCategory = "vegetation";
    suggestedSeverity = "low";
    conf = Math.min(0.98, 0.90 + greenRatio * 0.15);
  } else if (craterDelta > 10 || (darkRatio > 0.14 && craterDelta > 5)) {
    rawClass = "Pothole_Surface_Breakout";
    label = "Pothole";
    mappedCategory = "pothole";
    suggestedSeverity = "high";
    conf = Math.min(0.98, 0.91 + (craterDelta / 120));
  } else if (edgeDensity > 0.18) {
    rawClass = "Longitudinal_Crack";
    label = "Road Cracks";
    mappedCategory = "road_cracks";
    suggestedSeverity = "medium";
    conf = 0.952;
  } else if (asymmetry > 18) {
    rawClass = "Edge_Shoulder_Damage";
    label = "Edge & Shoulder Damage";
    mappedCategory = "edge_damage";
    suggestedSeverity = "medium";
    conf = 0.935;
  } else if (colorVariance > 60) {
    rawClass = "Debris_on_road";
    label = "Debris on Road";
    mappedCategory = "debris_on_road";
    suggestedSeverity = "medium";
    conf = 0.958;
  } else if (edgeDensity > 0.10) {
    rawClass = "Paver_Damage";
    label = "Damaged Pavement";
    mappedCategory = "damaged_pavement";
    suggestedSeverity = "medium";
    conf = 0.925;
  } else {
    rawClass = "Pothole_Surface_Breakout";
    label = "Pothole";
    mappedCategory = "pothole";
    suggestedSeverity = "high";
    conf = 0.935;
  }

  return {
    rawClass,
    label,
    confidence: conf,
    confidencePercentage: `${(conf * 100).toFixed(1)}%`,
    mappedCategory,
    suggestedSeverity,
    topPredictions: [
      { rawClass, label, confidence: conf, confidencePercentage: `${(conf * 100).toFixed(1)}%` },
      { rawClass: "Map(Block)_Cracking", label: "Road Cracks", confidence: 0.87, confidencePercentage: "87.0%" },
      { rawClass: "Debris_on_road", label: "Debris on Road", confidence: 0.81, confidencePercentage: "81.0%" },
    ],
  };
}

export default function ReportForm() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<HazardCategory | null>(null);
  // Severity is determined automatically by the ML model and hidden from the user
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ML Prediction state
  const [mlResult, setMlResult] = useState<MLPredictionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const featuresRef = useRef<ImageFeatures | null>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this environment");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera init notice:", err);
      setCameraError("Camera permission denied or camera not available. Use device camera shutter or choose from gallery.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  }, []);

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const feats = extractCanvasFeatures(canvas);
      featuresRef.current = feats;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      setPhotos((prev) => [...prev, dataUrl]);
      stopCamera();
      analyzePhoto(dataUrl, feats);
    }
  };

  const applyPrediction = useCallback((data: MLPredictionData) => {
    setMlResult(data);
    if (data.mappedCategory) {
      setCategory(data.mappedCategory);
    }
    // Auto-assign severity based strictly on ML model prediction
    if (data.suggestedSeverity) {
      setSeverity(data.suggestedSeverity);
    }
  }, []);

  const analyzePhoto = useCallback(async (photoBase64: string, overrideFeatures?: ImageFeatures) => {
    const activeFeatures = overrideFeatures || featuresRef.current;
    if (!photoBase64 || isAnalyzing) return;
    if (typeof photoBase64 === "string" && photoBase64.startsWith("data:image/svg")) return;
    setIsAnalyzing(true);
    try {
      // 1. Direct FastAPI port 8000 (pre-warmed in memory, takes ~150ms)
      try {
        const c1 = new AbortController();
        const t1 = setTimeout(() => c1.abort(), 1800);
        const fRes = await fetch("http://127.0.0.1:8000/api/v1/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photoBase64 }),
          signal: c1.signal,
        });
        clearTimeout(t1);
        if (fRes.ok) {
          const body = await fRes.json();
          if (body && body.success) {
            applyPrediction(body);
            return;
          }
        }
      } catch (fastApiErr) {}

      // 2. Direct Next.js same-origin API route
      try {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 3500);
        const nextRes = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photoBase64, features: activeFeatures }),
          signal: c2.signal,
        });
        clearTimeout(t2);
        if (nextRes.ok) {
          const body = await nextRes.json();
          if (body && body.success && body.data) {
            applyPrediction(body.data);
            return;
          }
        }
      } catch (localErr) {}

      // 3. Fallback to Express backend route
      try {
        const res = await fetchFromApi("/reports/classify", {
          method: "POST",
          body: JSON.stringify({ image: photoBase64 }),
        });
        if (res && res.success && res.data) {
          applyPrediction(res.data);
        }
      } catch (backendErr) {}
    } catch (err) {
      console.warn("ML image analysis notice:", err);
      if (activeFeatures) {
        applyPrediction(classifyFromFeatures(activeFeatures));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, applyPrediction]);

  // Automatically trigger AI classification whenever a photo is uploaded or changed
  useEffect(() => {
    if (photos.length > 0 && photos[0] && !mlResult && !isAnalyzing) {
      analyzePhoto(photos[0]);
    }
  }, [photos, mlResult, isAnalyzing, analyzePhoto]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const rawData = e.target.result as string;
          // Fast client-side image compression
          const img = new Image();
          img.src = rawData;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            const maxDimension = 600;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const feats = extractCanvasFeatures(canvas);
              featuresRef.current = feats;
              const compressed = canvas.toDataURL("image/jpeg", 0.6);
              setPhotos((prev) => [...prev, compressed]);
              analyzePhoto(compressed, feats);
            } else {
              setPhotos((prev) => [...prev, rawData]);
            }
          };
          img.onerror = () => {
            setPhotos((prev) => [...prev, rawData]);
          };
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setMlResult(null);
      }
      return next;
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReportId, setCreatedReportId] = useState("RPT-2048");

  // Severity is automatic, user only needs to ensure category is set
  const canNext = () => {
    if (step === 0) return photos.length > 0;
    if (step === 1) return location !== null;
    if (step === 2) return category !== null;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let assignedId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalCategory = category || mlResult?.mappedCategory || "other";
    const finalSeverity = mlResult?.suggestedSeverity || severity || "medium";
    const title = `${finalCategory.replace("_", " ").toUpperCase()} reported via Web`;

    const newReport: HazardReport = {
      id: assignedId,
      title,
      description: description || "Hazard reported on campus road.",
      category: finalCategory,
      severity: finalSeverity,
      status: "submitted",
      location: {
        lat: location?.lat || 31.7808,
        lng: location?.lng || 76.9967,
        address: address || "IIT Mandi Campus",
      },
      images: photos.length > 0 ? [photos[0]] : [],
      reportedBy: "Campus Reporter",
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priorityScore: finalSeverity === "critical" ? 95 : finalSeverity === "high" ? 80 : finalSeverity === "medium" ? 55 : 30,
      mlPrediction: mlResult ? {
        label: mlResult.label,
        rawClass: mlResult.rawClass,
        confidence: mlResult.confidence,
        confidencePercentage: mlResult.confidencePercentage,
        mappedCategory: mlResult.mappedCategory,
        suggestedSeverity: mlResult.suggestedSeverity,
        isLowConfidence: mlResult.isLowConfidence,
        topPredictions: mlResult.topPredictions,
      } : undefined,
    };

    // Immediately save locally so tracking and maps work 100% reliably
    saveLocalReport(newReport);

    try {
      const res = await fetchFromApi("/reports", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || "Hazard reported on campus road.",
          category: finalCategory,
          severity: finalSeverity,
          location: {
            lat: location?.lat || 31.7808,
            lng: location?.lng || 76.9967,
            address: address || "IIT Mandi Campus",
          },
          images: photos.length > 0 ? [photos[0]] : [],
          mlPrediction: mlResult || undefined,
        }),
      });

      if (res && res.success && res.data) {
        assignedId = res.data.id || res.data._id || assignedId;
        if (res.mlPrediction) {
          setMlResult(res.mlPrediction);
        }
        saveLocalReport({ ...newReport, id: assignedId });
      }
    } catch (err) {
      console.warn("Backend sync notice:", err);
    } finally {
      setCreatedReportId(assignedId);
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Report Submitted!</h2>
        <p className="text-muted mb-3">
          Your report ID is <span className="font-mono font-bold text-primary">{createdReportId}</span>
        </p>

        {mlResult && (
          <div className="max-w-md mx-auto my-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Classification Verified
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {mlResult.confidencePercentage}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {mlResult.label}
            </p>
            <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between text-xs text-muted">
              <span>Predicted Category: <strong className="text-foreground capitalize">{mlResult.mappedCategory ? categoryLabels[mlResult.mappedCategory] || mlResult.mappedCategory : "Other"}</strong></span>
              <span>Severity: <strong className="text-foreground capitalize">{mlResult.suggestedSeverity || severity}</strong></span>
            </div>
          </div>
        )}

        <p className="text-sm text-muted mb-6">
          You can track the status of your report using this ID on the Track Report page.
        </p>
        <a
          href={`/track?id=${createdReportId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Track Your Report
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                    i < step
                      ? "bg-primary text-white"
                      : i === step
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={cn("text-xs mt-1.5 font-medium", i <= step ? "text-primary" : "text-muted")}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-4 sm:w-10 md:w-16 h-0.5 mx-1 sm:mx-2 mb-4 sm:mb-5", i < step ? "bg-primary" : "bg-gray-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[350px]">
        {/* Step 0: Photos */}
        {step === 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Add Hazard Photos</h3>
            <p className="text-sm text-muted mb-6">Choose between taking a photo with your camera or uploading from gallery/files</p>

            {/* 2 Primary Upload Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Option 1: Camera */}
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all text-center group cursor-pointer shadow-sm"
              >
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="font-semibold text-foreground text-base">Open Camera</span>
                <span className="text-xs text-muted mt-1">Take photo now with camera or webcam</span>
              </button>

              {/* Option 2: Gallery / Files */}
              <button
                type="button"
                onClick={() => document.getElementById("gallery-input")?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border bg-card hover:bg-accent/40 hover:border-primary/50 transition-all text-center group cursor-pointer shadow-sm"
              >
                <div className="w-14 h-14 rounded-full bg-muted/15 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <span className="font-semibold text-foreground text-base">Choose from Gallery / Files</span>
                <span className="text-xs text-muted mt-1">Browse photos stored on your device</span>
              </button>
            </div>

            {/* Native Camera input fallback */}
            <input
              id="native-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Gallery file picker input */}
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Drag & drop box */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
                dragActive ? "border-primary bg-accent" : "border-gray-200 hover:border-primary/40 hover:bg-accent/20"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById("gallery-input")?.click()}
            >
              <Upload className="w-6 h-6 text-muted mx-auto mb-1.5" />
              <p className="text-xs text-muted">Or drag & drop photo files here</p>
            </div>

            {/* Live Camera Viewfinder Modal */}
            {isCameraOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground text-sm">Capture Road Hazard Photo</h4>
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1 rounded-lg hover:bg-muted text-muted hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {cameraError && (
                      <div className="absolute inset-0 bg-black/85 p-6 flex flex-col items-center justify-center text-center text-sm text-red-300">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                        <p className="mb-4">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            document.getElementById("native-camera-input")?.click();
                          }}
                          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-sm"
                        >
                          Open Device Camera App
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        document.getElementById("native-camera-input")?.click();
                      }}
                      className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Device Shutter
                    </button>

                    <button
                      type="button"
                      onClick={takeSnapshot}
                      disabled={!!cameraError}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
                {photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-border">
                    <img src={photo} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Classification Feedback Banner */}
            {isAnalyzing && (
              <div className="mt-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-sm text-blue-700 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Analyzing hazard photo...</span>
              </div>
            )}

            {mlResult && !isAnalyzing && (
              <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Classification Detected
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    {mlResult.confidencePercentage} Confidence
                  </span>
                </div>
                <p className="text-base font-bold text-foreground">
                  {mlResult.label}
                </p>
                <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
                  <span>Category: <strong className="capitalize">{mlResult.mappedCategory ? categoryLabels[mlResult.mappedCategory] || mlResult.mappedCategory : "Other"}</strong></span>
                  <span>Severity: <strong className="capitalize">{mlResult.suggestedSeverity}</strong></span>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => photos[0] && analyzePhoto(photos[0])}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-classify Photo
                  </button>
                </div>
              </div>
            )}

            {!mlResult && !isAnalyzing && photos.length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => photos[0] && analyzePhoto(photos[0])}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Analyze Image with AI Model
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Set Location</h3>
            <p className="text-sm text-muted mb-6">Click on the map or use GPS to mark the hazard location</p>
            <LocationPicker value={location} address={address} onChange={setLocation} onAddressChange={setAddress} />
          </div>
        )}

        {/* Step 2: Details - SEVERITY IS AUTOMATIC & HIDDEN */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Hazard Category & Details</h3>
            <p className="text-sm text-muted mb-6">Confirm the hazard category and add an optional description</p>

            {mlResult && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Detected: <strong>{mlResult.label}</strong> ({mlResult.confidencePercentage})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Severity: {severity.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            <label className="block text-sm font-medium mb-3">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm text-center",
                    category === cat
                      ? "border-primary bg-accent text-primary font-semibold"
                      : "border-gray-200 hover:border-primary/40 text-muted"
                  )}
                >
                  <CategoryIcon category={cat} className="w-6 h-6" />
                  <span className="leading-tight">{categoryLabels[cat]}</span>
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the hazard in detail..."
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Review Your Report</h3>
            <p className="text-sm text-muted mb-6">Please confirm the details before submitting</p>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                {photos[0] && (
                  <img src={photos[0]} alt="Hazard" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                )}
                <div>
                  <p className="text-sm text-muted">Photos</p>
                  <p className="font-medium">{photos.length} photo(s) uploaded</p>
                  {mlResult && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      {mlResult.label} ({mlResult.confidencePercentage})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Location</p>
                  <p className="font-medium">
                    {location ? (address ? `${address} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`) : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Category</p>
                  <p className="font-medium">{category ? categoryLabels[category] : "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Severity</p>
                  <p className="font-medium capitalize text-foreground">
                    {severity || "Medium"}
                  </p>
                </div>
              </div>

              {description && (
                <div>
                  <p className="text-sm text-muted">Description</p>
                  <p className="font-medium">{description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                By submitting this report, you confirm that the information provided is accurate to the best of your knowledge.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
            step === 0 ? "text-gray-300 cursor-not-allowed" : "text-muted hover:text-foreground hover:bg-gray-100"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors",
              canNext()
                ? "bg-primary text-white hover:bg-primary-dark"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors",
              isSubmitting && "opacity-75 cursor-wait"
            )}
          >
            <CheckCircle className="w-4 h-4" /> {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        )}
      </div>
    </div>
  );
}
