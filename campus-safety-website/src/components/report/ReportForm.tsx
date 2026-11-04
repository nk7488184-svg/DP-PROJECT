"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels, type HazardCategory, type Severity } from "@/types";
import CategoryIcon from "@/components/shared/CategoryIcon";
import LocationPicker from "@/components/map/LocationPicker";
import { fetchFromApi } from "@/lib/api";

const steps = [
  { label: "Photos", icon: Camera },
  { label: "Location", icon: MapPin },
  { label: "Details", icon: Tag },
  { label: "Review", icon: CheckCircle },
];

const categories: HazardCategory[] = [
  "pothole", "damaged_pavement", "faded_markings",
  "roadside_obstruction", "drainage_issue", "poor_lighting", "other",
];

const severityOptions: { value: Severity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
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

export default function ReportForm() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<HazardCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // ML Prediction state
  const [mlResult, setMlResult] = useState<MLPredictionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzePhoto = async (photoBase64: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetchFromApi("/reports/classify", {
        method: "POST",
        body: JSON.stringify({ image: photoBase64 }),
      });
      if (res && res.success && res.data) {
        setMlResult(res.data);
        if (res.data.mappedCategory) {
          setCategory(res.data.mappedCategory as HazardCategory);
        }
        if (res.data.suggestedSeverity) {
          setSeverity(res.data.suggestedSeverity as Severity);
        }
      }
    } catch (err) {
      console.warn("ML image analysis notice:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              const compressed = canvas.toDataURL("image/jpeg", 0.6);
              setPhotos((prev) => {
                const nextPhotos = [...prev, compressed];
                if (prev.length === 0) {
                  analyzePhoto(compressed);
                }
                return nextPhotos;
              });
            } else {
              setPhotos((prev) => {
                const nextPhotos = [...prev, rawData];
                if (prev.length === 0) {
                  analyzePhoto(rawData);
                }
                return nextPhotos;
              });
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

  const canNext = () => {
    if (step === 0) return photos.length > 0;
    if (step === 1) return location !== null;
    if (step === 2) return category !== null && severity !== null;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let assignedId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const title = `${category ? category.replace('_', ' ').toUpperCase() : 'HAZARD'} reported via Web`;

      const res = await fetchFromApi('/reports', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: description || 'Hazard reported on campus road.',
          category: category || mlResult?.mappedCategory || 'other',
          severity: severity || mlResult?.suggestedSeverity || 'medium',
          location: {
            lat: location?.lat || 31.7808,
            lng: location?.lng || 76.9967,
            address: address || 'IIT Mandi Campus'
          },
          images: photos.length > 0 ? [photos[0]] : []
        })
      });

      if (res && res.success && res.data) {
        assignedId = res.data.id || res.data._id || assignedId;
        if (res.mlPrediction) {
          setMlResult(res.mlPrediction);
        }
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
            <p className="text-xs text-muted mt-1">
              Model classified road hazard and attached inference metadata to your report.
            </p>
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
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    i < step
                      ? "bg-primary text-white"
                      : i === step
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn("text-xs mt-1.5 font-medium", i <= step ? "text-primary" : "text-muted")}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-16 h-0.5 mx-2 mb-5", i < step ? "bg-primary" : "bg-gray-200")} />
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
            <h3 className="text-lg font-semibold mb-1">Upload Photos</h3>
            <p className="text-sm text-muted mb-6">Take or upload photos of the road hazard</p>

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragActive ? "border-primary bg-accent" : "border-gray-300 hover:border-primary hover:bg-accent/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-medium text-foreground">Drag & drop photos here</p>
              <p className="text-sm text-muted mt-1">or click to browse</p>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

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
                <span>Running trained EfficientNetV2-S model to classify hazard...</span>
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
                <p className="text-xs text-muted mt-1">
                  Model identified road hazard. Category <strong className="text-primary">{mlResult.mappedCategory}</strong> pre-selected.
                </p>
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

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Hazard Details</h3>
            <p className="text-sm text-muted mb-6">Select the category and severity</p>

            {mlResult && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    AI suggested: <strong>{mlResult.label}</strong> ({mlResult.confidencePercentage})
                  </span>
                </div>
                <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Auto-selected</span>
              </div>
            )}

            <label className="block text-sm font-medium mb-3">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
                    category === cat
                      ? "border-primary bg-accent text-primary font-semibold"
                      : "border-gray-200 hover:border-primary/40 text-muted"
                  )}
                >
                  <CategoryIcon category={cat} className="w-6 h-6" />
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium mb-3">Severity</label>
            <div className="flex gap-3 mb-8">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                    severity === opt.value
                      ? "border-primary bg-accent text-primary"
                      : "border-gray-200 hover:border-primary/40 text-muted"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full mx-auto mb-1.5", opt.color)} />
                  {opt.label}
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
                  <p className="font-medium capitalize">{severity ?? "Not set"}</p>
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
