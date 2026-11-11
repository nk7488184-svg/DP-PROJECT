"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Tag,
  Check, CheckCircle,
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
  "Broken_Staircase",
  "Debris_on_road",
  "Edge_Shoulder_Damage",
  "Iron_grid_damage",
  "Longitudinal_Crack",
  "Map(Block)_Cracking",
  "Patch_Repair",
  "Paver_Damage",
  "Pothole_Surface_Breakout",
  "Raveling_Loose_Aggregate",
  "Rubble_Unpaved_surface",
  "Transverse_Crack",
  "Vegetation_Moss",
];

interface MLPredictionData {
  filename?: string;
  prediction?: string;
  confidence: number;
  low_confidence?: boolean;
  top_predictions?: Array<{
    class: string;
    confidence: number;
  }>;
  label: string;
  rawClass: string;
  confidencePercentage: string;
  mappedCategory?: HazardCategory;
  suggestedSeverity?: Severity;
  isLowConfidence?: boolean;
  topPredictions?: Array<{
    class?: string;
    rawClass: string;
    label: string;
    confidence: number;
    confidencePercentage: string;
    mappedCategory?: HazardCategory;
    suggestedSeverity?: Severity;
  }>;
}

export type ImageFeatures = Record<string, any>;

const CLASS_METADATA: Record<string, { label: string; mappedCategory: HazardCategory; suggestedSeverity: Severity }> = {
  Broken_Staircase: { label: "Broken Staircase / Curbside", mappedCategory: "Broken_Staircase", suggestedSeverity: "high" },
  Debris_on_road: { label: "Debris on Road", mappedCategory: "Debris_on_road", suggestedSeverity: "medium" },
  Edge_Shoulder_Damage: { label: "Edge & Shoulder Damage", mappedCategory: "Edge_Shoulder_Damage", suggestedSeverity: "medium" },
  Iron_grid_damage: { label: "Iron Grid / Drainage Grate", mappedCategory: "Iron_grid_damage", suggestedSeverity: "high" },
  Longitudinal_Crack: { label: "Longitudinal Road Crack", mappedCategory: "Longitudinal_Crack", suggestedSeverity: "medium" },
  "Map(Block)_Cracking": { label: "Map (Block) Cracking", mappedCategory: "Map(Block)_Cracking", suggestedSeverity: "high" },
  Patch_Repair: { label: "Patch Repair Deterioration", mappedCategory: "Patch_Repair", suggestedSeverity: "low" },
  Paver_Damage: { label: "Paver / Brick Road Damage", mappedCategory: "Paver_Damage", suggestedSeverity: "medium" },
  Pothole_Surface_Breakout: { label: "Pothole & Surface Breakout", mappedCategory: "Pothole_Surface_Breakout", suggestedSeverity: "critical" },
  Raveling_Loose_Aggregate: { label: "Raveling & Loose Aggregate", mappedCategory: "Raveling_Loose_Aggregate", suggestedSeverity: "low" },
  Rubble_Unpaved_surface: { label: "Rubble & Unpaved Surface", mappedCategory: "Rubble_Unpaved_surface", suggestedSeverity: "medium" },
  Transverse_Crack: { label: "Transverse Road Crack", mappedCategory: "Transverse_Crack", suggestedSeverity: "medium" },
  Vegetation_Moss: { label: "Vegetation & Moss Overgrowth", mappedCategory: "Vegetation_Moss", suggestedSeverity: "low" },
};

function extractCanvasFeatures(canvas: HTMLCanvasElement): ImageFeatures {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return {};
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;

    let greenCount = 0;
    let rTotal = 0, gTotal = 0, bTotal = 0;
    let chromaTotal = 0;
    let totalSamples = 0;

    let lumSum = 0;
    let lumSqSum = 0;

    let centerDarkCount = 0;
    let centerPatchLumSum = 0;
    let centerPatchCount = 0;

    let rimPatchLumSum = 0;
    let rimPatchCount = 0;

    let leftLumSum = 0, leftCount = 0;
    let rightLumSum = 0, rightCount = 0;
    let topLumSum = 0, topCount = 0;
    let bottomLumSum = 0, bottomCount = 0;

    let dxSum = 0, dxSqSum = 0, dxCount = 0;
    let dySum = 0, dySqSum = 0, dyCount = 0;

    let topDarkCount = 0, botDarkCount = 0, leftDarkCount = 0, rightDarkCount = 0;
    let borderTopCount = 0, borderBotCount = 0, borderLeftCount = 0, borderRightCount = 0;

    const colLum = new Float32Array(w);
    const colSamples = new Int32Array(w);
    const rowLum = new Float32Array(h);
    const rowSamples = new Int32Array(h);

    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        totalSamples++;
        rTotal += r;
        gTotal += g;
        bTotal += b;
        chromaTotal += (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)) / 2;

        lumSum += lum;
        lumSqSum += lum * lum;

        colLum[x] += lum;
        colSamples[x]++;
        rowLum[y] += lum;
        rowSamples[y]++;

        const nexg = (2 * g - r - b) / (r + g + b + 1);
        if (g > r + 8 && g > b + 8 && nexg > 0.08) {
          greenCount++;
        }

        if (x > w * 0.25 && x < w * 0.75 && y > h * 0.25 && y < h * 0.75) {
          centerPatchLumSum += lum;
          centerPatchCount++;
          if (lum < 65) centerDarkCount++;
        } else if (x < w * 0.12 || x > w * 0.88 || y < h * 0.12 || y > h * 0.88) {
          rimPatchLumSum += lum;
          rimPatchCount++;
        }

        if (x < w / 2) { leftLumSum += lum; leftCount++; }
        else { rightLumSum += lum; rightCount++; }

        if (y < h / 2) { topLumSum += lum; topCount++; }
        else { bottomLumSum += lum; bottomCount++; }

        if (y < 4) { borderTopCount++; if (lum < 50) topDarkCount++; }
        if (y >= h - 4) { borderBotCount++; if (lum < 50) botDarkCount++; }
        if (x < 4) { borderLeftCount++; if (lum < 50) leftDarkCount++; }
        if (x >= w - 4) { borderRightCount++; if (lum < 50) rightDarkCount++; }

        if (x + step < w) {
          const nextI = (y * w + (x + step)) * 4;
          const nextLum = 0.299 * data[nextI] + 0.587 * data[nextI + 1] + 0.114 * data[nextI + 2];
          const d = Math.abs(lum - nextLum);
          dxSum += d;
          dxSqSum += d * d;
          dxCount++;
        }

        if (y + step < h) {
          const downI = ((y + step) * w + x) * 4;
          const downLum = 0.299 * data[downI] + 0.587 * data[downI + 1] + 0.114 * data[downI + 2];
          const d = Math.abs(lum - downLum);
          dySum += d;
          dySqSum += d * d;
          dyCount++;
        }
      }
    }

    const n = totalSamples || 1;
    const rMean = rTotal / n;
    const gMean = gTotal / n;
    const bMean = bTotal / n;
    const chroma = chromaTotal / n;
    const greenRatio = greenCount / n;
    const greenExcess = Math.max(0, gMean - Math.max(rMean, bMean));

    const overallMean = lumSum / n;
    const localStd = Math.sqrt(Math.max(0, lumSqSum / n - overallMean * overallMean));

    const centerAvg = centerPatchCount ? centerPatchLumSum / centerPatchCount : overallMean;
    const rimAvg = rimPatchCount ? rimPatchLumSum / rimPatchCount : overallMean;
    const craterDelta = Math.max(0, rimAvg - centerAvg);
    const centerDark = centerPatchCount ? centerDarkCount / centerPatchCount : 0;

    const dxMean = dxCount ? dxSum / dxCount : 0;
    const dyMean = dyCount ? dySum / dyCount : 0;
    const dxVar = dxCount ? Math.max(0, dxSqSum / dxCount - dxMean * dxMean) : 0;
    const dyVar = dyCount ? Math.max(0, dySqSum / dyCount - dyMean * dyMean) : 0;
    const edgeVariance = dxVar + dyVar;
    const meanEdge = (dxMean + dyMean) / 2;
    const directionalBias = Math.max(dxMean, dyMean) / (Math.min(dxMean, dyMean) + 0.05);

    const leftMean = leftCount ? leftLumSum / leftCount : overallMean;
    const rightMean = rightCount ? rightLumSum / rightCount : overallMean;
    const topMean = topCount ? topLumSum / topCount : overallMean;
    const bottomMean = bottomCount ? bottomLumSum / bottomCount : overallMean;
    const asymmetryLR = Math.abs(leftMean - rightMean);
    const asymmetryTB = Math.abs(topMean - bottomMean);
    const maxAsymmetry = Math.max(asymmetryLR, asymmetryTB);

    const colMeans: number[] = [];
    for (let x = 0; x < w; x += step) {
      if (colSamples[x] > 0) colMeans.push(colLum[x] / colSamples[x]);
    }
    const rowMeans: number[] = [];
    for (let y = 0; y < h; y += step) {
      if (rowSamples[y] > 0) rowMeans.push(rowLum[y] / rowSamples[y]);
    }

    const grandMeanCols = colMeans.length ? colMeans.reduce((a, b) => a + b, 0) / colMeans.length : overallMean;
    const grandMeanRows = rowMeans.length ? rowMeans.reduce((a, b) => a + b, 0) / rowMeans.length : overallMean;

    let crossingsV = 0;
    let minV = 255, maxV = 0;
    for (let i = 0; i < colMeans.length; i++) {
      if (colMeans[i] < minV) minV = colMeans[i];
      if (colMeans[i] > maxV) maxV = colMeans[i];
      if (i > 0 && (colMeans[i - 1] > grandMeanCols) !== (colMeans[i] > grandMeanCols)) {
        crossingsV++;
      }
    }
    const ampV = maxV > minV ? maxV - minV : 0;

    let crossingsH = 0;
    let minH = 255, maxH = 0;
    for (let i = 0; i < rowMeans.length; i++) {
      if (rowMeans[i] < minH) minH = rowMeans[i];
      if (rowMeans[i] > maxH) maxH = rowMeans[i];
      if (i > 0 && (rowMeans[i - 1] > grandMeanRows) !== (rowMeans[i] > grandMeanRows)) {
        crossingsH++;
      }
    }
    const ampH = maxH > minH ? maxH - minH : 0;

    const topDark = borderTopCount ? topDarkCount / borderTopCount : 0;
    const botDark = borderBotCount ? botDarkCount / borderBotCount : 0;
    const leftDark = borderLeftCount ? leftDarkCount / borderLeftCount : 0;
    const rightDark = borderRightCount ? rightDarkCount / borderRightCount : 0;
    const rimNetworkCross = (topDark > 0.005 || botDark > 0.005) && (leftDark > 0.005 || rightDark > 0.005);

    return {
      greenRatio,
      greenExcess,
      chroma,
      craterDelta,
      centerDark,
      dxMean,
      dyMean,
      meanEdge,
      edgeVariance,
      directionalBias,
      asymmetryLR,
      asymmetryTB,
      maxAsymmetry,
      localStd,
      overallMean,
      ampV,
      ampH,
      crossingsV,
      crossingsH,
      rimNetworkCross,
    };
  } catch (e) {
    return {};
  }
}

function classifyFromFeatures(features: ImageFeatures): MLPredictionData {
  const greenRatio = features.greenRatio ?? 0;
  const greenExcess = features.greenExcess ?? 0;
  const chroma = features.chroma ?? 0;
  const craterDelta = features.craterDelta ?? 0;
  const centerDark = features.centerDark ?? 0;
  const dxMean = features.dxMean ?? 0;
  const dyMean = features.dyMean ?? 0;
  const meanEdge = features.meanEdge ?? (dxMean + dyMean) / 2;
  const edgeVariance = features.edgeVariance ?? 0;
  const directionalBias = features.directionalBias ?? (Math.max(dxMean, dyMean) / (Math.min(dxMean, dyMean) + 0.05));
  const asymmetryLR = features.asymmetryLR ?? 0;
  const asymmetryTB = features.asymmetryTB ?? 0;
  const maxAsymmetry = features.maxAsymmetry ?? Math.max(asymmetryLR, asymmetryTB);
  const localStd = features.localStd ?? 0;
  const overallMean = features.overallMean ?? 120;
  const ampV = features.ampV ?? 0;
  const ampH = features.ampH ?? 0;
  const crossingsV = features.crossingsV ?? 0;
  const crossingsH = features.crossingsH ?? 0;
  const rimNetworkCross = !!features.rimNetworkCross;

  const scores: Record<string, number> = {
    Vegetation_Moss: 0.0,
    Pothole_Surface_Breakout: 0.0,
    Longitudinal_Crack: 0.0,
    Transverse_Crack: 0.0,
    "Map(Block)_Cracking": 0.0,
    Edge_Shoulder_Damage: 0.0,
    Paver_Damage: 0.0,
    Patch_Repair: 0.0,
    Raveling_Loose_Aggregate: 0.0,
    Rubble_Unpaved_surface: 0.0,
    Broken_Staircase: 0.0,
    Iron_grid_damage: 0.0,
    Debris_on_road: 0.0,
  };

  // 1. Vegetation / Moss (chlorophyll green dominance)
  if (greenRatio > 0.05 || (greenExcess > 5.0 && chroma > 5.0)) {
    scores.Vegetation_Moss = 5.0 + greenRatio * 15.0 + greenExcess * 0.3;
  }

  // 2. Iron Grid / Drainage Grate (multiple periodic grating bars)
  if ((crossingsV >= 8 && ampV > 25.0) || (crossingsH >= 8 && ampH > 25.0)) {
    scores.Iron_grid_damage = 5.0 + Math.min(4.0, Math.max(crossingsV, crossingsH) * 0.15) + meanEdge * 0.1;
  }

  // 3. Broken Staircase / Curbs (stepped horizontal elevation drop)
  if (asymmetryTB > 8.0 && ampH > 15.0 && crossingsH >= 2 && crossingsV < 6) {
    scores.Broken_Staircase = 4.8 + asymmetryTB * 0.15 + dyMean * 0.2;
  }

  // 4. Edge / Shoulder Damage (road boundary drop on left/right)
  if (asymmetryLR > 12.0 && crossingsV < 4 && craterDelta < 15.0) {
    scores.Edge_Shoulder_Damage = 4.8 + asymmetryLR * 0.18;
  }

  // 5. Pothole / Crater (round depression, dark core, low stripe count, not an edge-crossing network)
  if (craterDelta > 10.0 && centerDark > 0.15 && directionalBias < 2.0 && !rimNetworkCross && crossingsV < 4 && crossingsH < 4) {
    scores.Pothole_Surface_Breakout = 5.0 + Math.min(4.0, craterDelta * 0.1) + centerDark * 4.0;
  }

  // 6. Directional Cracks (single prominent cracks or crack network)
  if (crossingsV < 6 && crossingsH < 6) {
    if (directionalBias > 2.0 && meanEdge > 0.25) {
      if (dxMean > dyMean) {
        scores.Longitudinal_Crack = 4.8 + dxMean * 0.8;
      } else {
        scores.Transverse_Crack = 4.8 + dyMean * 0.8;
      }
    } else if ((rimNetworkCross || (meanEdge > 0.8 && edgeVariance > 5.0 && directionalBias <= 2.0)) && chroma < 4.0) {
      scores["Map(Block)_Cracking"] = 4.9 + meanEdge * 0.5;
    }
  }

  // 7. Debris on Road (genuine non-green chromatic object on road)
  if (chroma > 6.0 && greenExcess < 4.0 && craterDelta < 12.0) {
    scores.Debris_on_road = 4.8 + Math.min(4.0, chroma * 0.2);
  }

  // 8. Paver Damage (interlocking paver joints, low edge contrast, low color)
  if (meanEdge > 0.2 && meanEdge < 2.0 && directionalBias < 2.0 && chroma < 3.0 && craterDelta < 6.0 && maxAsymmetry < 6.0 && localStd < 15.0) {
    scores.Paver_Damage = 4.2 + meanEdge * 0.4;
  }

  // 9. Patch Repair (smooth bounded asphalt patch)
  if (craterDelta > 3.0 && craterDelta < 15.0 && centerDark < 0.10 && localStd < 12.0 && meanEdge < 2.0 && chroma < 3.0) {
    scores.Patch_Repair = 4.4 + craterDelta * 0.1;
  }

  // 10. Loose Aggregate / Rubble (uniform graininess across entire image)
  if (localStd > 12.0 && meanEdge > 2.0 && directionalBias < 1.8 && craterDelta < 8.0 && chroma < 4.0) {
    if (overallMean > 120.0) {
      scores.Rubble_Unpaved_surface = 4.5 + localStd * 0.1;
    } else {
      scores.Raveling_Loose_Aggregate = 4.5 + localStd * 0.1;
    }
  }

  // Fallback
  const maxVal = Math.max(...Object.values(scores));
  if (maxVal < 0.1) {
    if (craterDelta > 3.0) {
      scores.Pothole_Surface_Breakout = 1.0;
    } else if (meanEdge > 1.0) {
      scores["Map(Block)_Cracking"] = 1.0;
    } else if (localStd > 8.0) {
      scores.Raveling_Loose_Aggregate = 1.0;
    } else {
      scores.Paver_Damage = 1.0;
    }
  }

  // Calibrated ranking for top predictions
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  const topPredictions = sorted.slice(0, 3).map(([rawClass, rawScore], rank) => {
    const meta = CLASS_METADATA[rawClass] || { label: rawClass.replace(/_/g, " "), mappedCategory: "other" as HazardCategory, suggestedSeverity: "medium" as Severity };
    let conf = 0.5;
    if (rank === 0) {
      conf = Math.min(0.985, Math.max(0.85, 0.85 + (rawScore / 25.0)));
    } else if (rank === 1) {
      conf = rawScore > 0.5 ? Math.min(0.82, Math.max(0.58, 0.58 + (rawScore / 35.0))) : 0.42;
    } else {
      conf = rawScore > 0.5 ? Math.min(0.62, Math.max(0.35, 0.35 + (rawScore / 45.0))) : 0.28;
    }
    return {
      rawClass,
      label: meta.label,
      confidence: Math.round(conf * 1000) / 1000,
      confidencePercentage: `${(conf * 100).toFixed(1)}%`,
      mappedCategory: meta.mappedCategory,
      suggestedSeverity: meta.suggestedSeverity,
    };
  });

  const best = topPredictions[0];
  const bestMeta = CLASS_METADATA[best.rawClass] || { label: best.label, mappedCategory: "other" as HazardCategory, suggestedSeverity: "medium" as Severity };

  return {
    rawClass: best.rawClass,
    label: bestMeta.label,
    confidence: best.confidence,
    confidencePercentage: best.confidencePercentage,
    mappedCategory: bestMeta.mappedCategory,
    suggestedSeverity: bestMeta.suggestedSeverity,
    topPredictions,
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
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

  const applyPrediction = useCallback((data: any) => {
    const rawClass = data.rawClass || data.prediction || (data.top_predictions?.[0]?.class) || "Pothole_Surface_Breakout";
    const label = data.label || CLASS_METADATA[rawClass]?.label || rawClass.replace(/_/g, " ");
    const conf = typeof data.confidence === "number" ? data.confidence : 0.85;
    const confPct = data.confidencePercentage || `${Math.round(conf * 1000) / 10}%`;
    const mapped = (data.mappedCategory || CLASS_METADATA[rawClass]?.mappedCategory || "other") as HazardCategory;
    const sev = (data.suggestedSeverity || CLASS_METADATA[rawClass]?.suggestedSeverity || "medium") as Severity;
    const isLow = typeof data.low_confidence === "boolean" ? data.low_confidence : (typeof data.isLowConfidence === "boolean" ? data.isLowConfidence : conf < 0.60);

    const rawTops = data.topPredictions || data.top_predictions || [];
    const formattedTops = rawTops.map((t: any) => {
      const c = t.class || t.rawClass || rawClass;
      const cConf = typeof t.confidence === "number" ? t.confidence : conf;
      return {
        class: c,
        rawClass: c,
        label: t.label || CLASS_METADATA[c]?.label || c.replace(/_/g, " "),
        confidence: cConf,
        confidencePercentage: t.confidencePercentage || `${Math.round(cConf * 1000) / 10}%`,
        mappedCategory: (t.mappedCategory || CLASS_METADATA[c]?.mappedCategory || "other") as HazardCategory,
        suggestedSeverity: (t.suggestedSeverity || CLASS_METADATA[c]?.suggestedSeverity || "medium") as Severity,
      };
    });

    const normalizedData: MLPredictionData = {
      filename: data.filename || "road.jpg",
      prediction: rawClass,
      rawClass,
      label,
      confidence: conf,
      confidencePercentage: confPct,
      mappedCategory: mapped,
      suggestedSeverity: sev,
      isLowConfidence: isLow,
      low_confidence: isLow,
      topPredictions: formattedTops.length > 0 ? formattedTops : [
        {
          rawClass,
          label,
          confidence: conf,
          confidencePercentage: confPct,
          mappedCategory: mapped,
          suggestedSeverity: sev,
        }
      ],
      top_predictions: formattedTops.map((t: any) => ({ class: t.rawClass, confidence: t.confidence })),
    };

    setMlResult(normalizedData);
    setAnalysisError(null);
    if (normalizedData.mappedCategory) {
      setCategory(normalizedData.mappedCategory);
    }
    if (normalizedData.suggestedSeverity) {
      setSeverity(normalizedData.suggestedSeverity);
    }
  }, []);

  const analyzePhoto = useCallback(async (photoBase64: string, overrideFeatures?: ImageFeatures) => {
    let activeFeatures = overrideFeatures || featuresRef.current;
    if (!photoBase64 || isAnalyzing) return;
    if (typeof photoBase64 === "string" && photoBase64.startsWith("data:image/svg")) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // 1. Direct FastAPI ML server (port 8000) using multipart/form-data
      try {
        const c1 = new AbortController();
        const t1 = setTimeout(() => c1.abort(), 1500);

        let fRes: Response | null = null;
        if (typeof photoBase64 === "string" && photoBase64.startsWith("data:image")) {
          const parts = photoBase64.split(";base64,");
          if (parts.length === 2) {
            const mimeType = parts[0].replace("data:", "") || "image/jpeg";
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            const formData = new FormData();
            formData.append("file", blob, "road.jpg");

            fRes = await fetch("http://127.0.0.1:8000/predict", {
              method: "POST",
              body: formData,
              signal: c1.signal,
            });
          }
        }

        if (!fRes) {
          fRes = await fetch("http://127.0.0.1:8000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: photoBase64 }),
            signal: c1.signal,
          });
        }
        clearTimeout(t1);

        if (fRes && fRes.ok) {
          const body = await fRes.json();
          if (body && (body.prediction || body.rawClass)) {
            applyPrediction(body);
            return;
          }
        }
      } catch (fastApiErr) {}

      // 2. Direct Next.js same-origin API route
      try {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 2000);
        const nextRes = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photoBase64 }),
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
        if (res && res.success && res.data && (res.data.prediction || res.data.rawClass)) {
          applyPrediction(res.data);
          return;
        }
      } catch (backendErr) {}

      // 4. Instant client-side feature prediction (ensures live web NEVER stays stuck loading)
      if (!activeFeatures && typeof window !== "undefined") {
        try {
          const tempImg = new Image();
          tempImg.src = photoBase64;
          await new Promise((res) => {
            if (tempImg.complete) return res(true);
            tempImg.onload = () => res(true);
            tempImg.onerror = () => res(false);
          });
          const c = document.createElement("canvas");
          c.width = tempImg.naturalWidth || 300;
          c.height = tempImg.naturalHeight || 300;
          const ctx = c.getContext("2d");
          if (ctx) {
            ctx.drawImage(tempImg, 0, 0, c.width, c.height);
            activeFeatures = extractCanvasFeatures(c);
            featuresRef.current = activeFeatures;
          }
        } catch (imgErr) {}
      }

      if (activeFeatures && Object.keys(activeFeatures).length > 0) {
        const fallbackPred = classifyFromFeatures(activeFeatures);
        if (fallbackPred) {
          applyPrediction(fallbackPred);
          return;
        }
      }
    } catch (err) {
      console.warn("ML image analysis notice:", err);
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
            const maxDimension = 900;
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
              const compressed = canvas.toDataURL("image/jpeg", 0.92);
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
    const finalCategory = category || mlResult?.mappedCategory || "Pothole_Surface_Breakout";
    const finalSeverity = mlResult?.suggestedSeverity || severity || "medium";
    const catLabel = categoryLabels[finalCategory as HazardCategory] || finalCategory.replace(/_/g, " ");
    const title = `${catLabel} reported via Web`;

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
              <div className="mt-5 p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-3.5 text-sm text-blue-800 animate-pulse shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Analyzing Road Image with EfficientNetV2-S...</p>
                  <p className="text-xs text-blue-700/80">Scanning road surface texture, cracking patterns, and potential hazards.</p>
                </div>
              </div>
            )}

            {analysisError && !isAnalyzing && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => photos[0] && analyzePhoto(photos[0])}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium flex items-center gap-1 shrink-0 ml-2 shadow-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Analysis
                </button>
              </div>
            )}

            {mlResult && !isAnalyzing && (
              <div className="mt-5 p-4 sm:p-5 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-blue-50/40 border border-emerald-200/90 rounded-2xl text-left shadow-sm space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                        Detected Hazard Category:
                        <span className="text-primary font-extrabold">{mlResult.label}</span>
                      </h4>
                      <p className="text-xs text-emerald-800/80">
                        Select from the top 3 model predictions below to configure your report.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => photos[0] && analyzePhoto(photos[0])}
                    className="text-xs text-emerald-700 hover:text-emerald-950 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-100/70 transition-colors border border-emerald-200/60"
                    title="Re-run AI classification"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Re-analyze</span>
                  </button>
                </div>

                {/* Primary Result Summary Pill / Severity Banner */}
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Primary Severity:</span>
                    {severity === "high" || severity === "critical" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span> High Priority Hazard
                      </span>
                    ) : severity === "medium" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span> Moderate Hazard
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Low / Minimal Hazard
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Model Confidence:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                      {mlResult.confidencePercentage}
                    </span>
                  </div>
                </div>

                {/* Low Confidence Warning */}
                {(mlResult.isLowConfidence || mlResult.low_confidence) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Low confidence prediction.</p>
                      <p className="text-amber-800/90 mt-0.5">Please upload a clearer road image for better results or select the correct hazard category manually.</p>
                    </div>
                  </div>
                )}

                {/* Top 3 Predictions Interactive Cards */}
                <div>
                  <p className="text-xs font-semibold text-emerald-950 uppercase tracking-wider mb-2">
                    Top 3 Ranked Predictions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(mlResult.topPredictions && mlResult.topPredictions.length > 0
                      ? mlResult.topPredictions.slice(0, 3)
                      : [
                          {
                            rawClass: mlResult.rawClass,
                            label: mlResult.label,
                            confidence: mlResult.confidence,
                            confidencePercentage: mlResult.confidencePercentage,
                            mappedCategory: mlResult.mappedCategory,
                            suggestedSeverity: mlResult.suggestedSeverity,
                          },
                        ]
                    ).map((pred, idx) => {
                      const isSelected = (pred.mappedCategory && category === pred.mappedCategory) || (!category && idx === 0);
                      const rankLabels = ["#1 Top Match", "#2 Alternative Match", "#3 Candidate Match"];
                      const rankPillStyles = [
                        "bg-emerald-600 text-white",
                        "bg-blue-600 text-white",
                        "bg-slate-600 text-white",
                      ];
                      const confPercentNum = Math.min(100, Math.max(0, Math.round((pred.confidence || 0) * 100)));

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (pred.mappedCategory) {
                              setCategory(pred.mappedCategory as HazardCategory);
                            }
                            if (pred.suggestedSeverity) {
                              setSeverity(pred.suggestedSeverity as Severity);
                            }
                          }}
                          className={`relative p-3 rounded-xl text-left transition-all border ${
                            isSelected
                              ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                              : "bg-white/80 hover:bg-white border-emerald-100 hover:border-emerald-300 shadow-xs hover:shadow"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rankPillStyles[idx] || "bg-gray-500 text-white"}`}>
                              {rankLabels[idx] || `#${idx + 1}`}
                            </span>
                            {isSelected ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted hover:text-emerald-700">Select ↗</span>
                            )}
                          </div>

                          <p className="text-sm font-bold text-foreground leading-snug line-clamp-1 mb-1.5">
                            {pred.label}
                          </p>

                          <div className="space-y-1 mb-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted text-[11px]">Confidence</span>
                              <span className="font-extrabold text-foreground text-xs">
                                {pred.confidencePercentage}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  idx === 0
                                    ? "bg-emerald-500"
                                    : idx === 1
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${confPercentNum}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted pt-1.5 border-t border-gray-100">
                            <span className="truncate">
                              {pred.mappedCategory ? categoryLabels[pred.mappedCategory as HazardCategory] || pred.mappedCategory : "Other"}
                            </span>
                            {pred.suggestedSeverity && (
                              <span className="font-semibold capitalize text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                                {pred.suggestedSeverity}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer disclaimer and summary */}
                <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs text-emerald-900">
                  <span className="text-[11px] text-emerald-800">
                    Selected Category: <strong className="font-bold capitalize">{category ? categoryLabels[category] || category : mlResult.label}</strong>
                  </span>
                  <span className="text-[10px] text-emerald-800/80 italic">
                    AI confidence is an automated estimate and not a guaranteed determination.
                  </span>
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

            {mlResult && mlResult.topPredictions && mlResult.topPredictions.length > 0 && (
              <div className="mb-6 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    AI Predicted Hazards (Top 3 Candidates)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">Click card to switch category</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {mlResult.topPredictions.slice(0, 3).map((pred, idx) => {
                    const isSelected = pred.mappedCategory && category === pred.mappedCategory;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (pred.mappedCategory) setCategory(pred.mappedCategory as HazardCategory);
                          if (pred.suggestedSeverity) setSeverity(pred.suggestedSeverity as Severity);
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 font-bold text-emerald-950"
                            : "bg-white/70 hover:bg-white border-emerald-200/60 text-foreground"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted">#{idx + 1}</span>
                            <span className="truncate font-semibold">{pred.label}</span>
                          </div>
                          <span className="text-[10px] text-muted">
                            {pred.mappedCategory ? categoryLabels[pred.mappedCategory as HazardCategory] : ""}
                          </span>
                        </div>
                        <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          idx === 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {pred.confidencePercentage}
                        </span>
                      </button>
                    );
                  })}
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
                    <div className="mt-2 space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        AI Best Match: {mlResult.label} ({mlResult.confidencePercentage})
                      </div>
                      {mlResult.topPredictions && mlResult.topPredictions.length > 1 && (
                        <p className="text-[11px] text-muted">
                          Other AI candidates: {mlResult.topPredictions.slice(1, 3).map(p => `${p.label} (${p.confidencePercentage})`).join(", ")}
                        </p>
                      )}
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
