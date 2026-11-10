import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export interface ImageFeatures {
  greenRatio?: number;
  greenExcess?: number;
  chroma?: number;
  craterDelta?: number;
  centerDark?: number;
  dxMean?: number;
  dyMean?: number;
  meanEdge?: number;
  edgeVariance?: number;
  directionalBias?: number;
  asymmetryLR?: number;
  asymmetryTB?: number;
  maxAsymmetry?: number;
  localStd?: number;
  overallMean?: number;
  ampV?: number;
  ampH?: number;
  crossingsV?: number;
  crossingsH?: number;
  rimNetworkCross?: boolean;
}

export const CLASS_METADATA: Record<string, { label: string; mappedCategory: string; suggestedSeverity: string }> = {
  Vegetation_Moss: { label: "Vegetation & Moss Overgrowth", mappedCategory: "roadside_obstruction", suggestedSeverity: "low" },
  Pothole_Surface_Breakout: { label: "Pothole & Surface Breakout", mappedCategory: "pothole", suggestedSeverity: "high" },
  Longitudinal_Crack: { label: "Longitudinal Road Crack", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  Transverse_Crack: { label: "Transverse Road Crack", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  "Map(Block)_Cracking": { label: "Map / Block Cracking", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  Edge_Shoulder_Damage: { label: "Edge & Shoulder Damage", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  Debris_on_road: { label: "Debris on Road", mappedCategory: "roadside_obstruction", suggestedSeverity: "medium" },
  Iron_grid_damage: { label: "Drainage Iron Grid Damage", mappedCategory: "drainage_issue", suggestedSeverity: "high" },
  Broken_Staircase: { label: "Broken Staircase / Curbside", mappedCategory: "roadside_obstruction", suggestedSeverity: "high" },
  Paver_Damage: { label: "Paver / Brick Road Damage", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  Patch_Repair: { label: "Patch Repair Deterioration", mappedCategory: "damaged_pavement", suggestedSeverity: "low" },
  Raveling_Loose_Aggregate: { label: "Raveling & Loose Aggregate", mappedCategory: "roadside_obstruction", suggestedSeverity: "low" },
  Rubble_Unpaved_surface: { label: "Rubble & Unpaved Surface", mappedCategory: "roadside_obstruction", suggestedSeverity: "low" },
};

const FASTAPI_URL = process.env.ML_API_URL || process.env.FASTAPI_URL || "http://127.0.0.1:8000";

function classifyFromFeatures(features: ImageFeatures) {
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
  if (asymmetryLR > 7.0 && maxAsymmetry > 8.0 && (crossingsV < 3 || crossingsH < 3)) {
    scores.Edge_Shoulder_Damage = 4.8 + asymmetryLR * 0.15 + dxMean * 0.2;
  }

  // 5. Rubble / Unpaved Surface (broad high texture variance across whole frame)
  if (localStd > 14.0 && edgeVariance > 18.0 && chroma < 12.0 && craterDelta < 6.0) {
    scores.Rubble_Unpaved_surface = 4.6 + localStd * 0.12 + edgeVariance * 0.08;
  }

  // 6. Raveling / Loose Aggregate (fine gravel surface without deep crater)
  if (meanEdge > 5.0 && edgeVariance > 12.0 && craterDelta < 5.0 && asymmetryLR < 6.0) {
    scores.Raveling_Loose_Aggregate = 4.5 + meanEdge * 0.25;
  }

  // 7. Paver / Cobblestone Damage (bimodal periodic grid texture)
  if (crossingsV >= 4 && crossingsH >= 4 && ampV > 12.0 && ampH > 12.0 && !scores.Iron_grid_damage) {
    scores.Paver_Damage = 4.7 + (crossingsV + crossingsH) * 0.1;
  }

  // 8. Patch Repair (asphalt color mismatch, square edge)
  if (chroma < 8.0 && overallMean > 70 && overallMean < 160 && (asymmetryLR > 4.0 || asymmetryTB > 4.0) && craterDelta < 6.0) {
    scores.Patch_Repair = 4.5 + maxAsymmetry * 0.1;
  }

  // 9. Longitudinal Road Crack (strong vertical line)
  if (directionalBias > 1.35 && dxMean > dyMean && dxMean > 5.0 && craterDelta < 7.0) {
    scores.Longitudinal_Crack = 4.8 + dxMean * 0.2 + (directionalBias - 1.0) * 0.5;
  }

  // 10. Transverse Road Crack (strong horizontal line across road)
  if (directionalBias > 1.35 && dyMean > dxMean && dyMean > 5.0 && craterDelta < 7.0) {
    scores.Transverse_Crack = 4.8 + dyMean * 0.2 + (directionalBias - 1.0) * 0.5;
  }

  // 11. Map / Block Cracking (network of interconnected hairline edges)
  if (rimNetworkCross || (meanEdge > 7.0 && directionalBias <= 1.35 && localStd > 8.0 && craterDelta < 8.0)) {
    scores["Map(Block)_Cracking"] = 4.7 + meanEdge * 0.2 + localStd * 0.08;
  }

  // 12. Pothole / Surface Breakout (genuine dark bowl-like depression)
  if ((centerDark > 7.0 && craterDelta > 6.0) || (craterDelta > 10.0)) {
    scores.Pothole_Surface_Breakout = 5.0 + craterDelta * 0.25 + centerDark * 0.15;
  }

  // 13. Debris on Road (localized surface obstruction)
  if (asymmetryLR > 5.0 && asymmetryTB > 5.0 && chroma > 4.0 && craterDelta < 7.0) {
    scores.Debris_on_road = 4.5 + (asymmetryLR + asymmetryTB) * 0.1;
  }

  // Rank classes by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const bestClass = sorted[0][0];
  const bestScore = sorted[0][1];

  const top3 = sorted.slice(0, 3).map(([rawCls, sc], idx) => {
    const meta = CLASS_METADATA[rawCls] || {
      label: rawCls.replace(/_/g, " "),
      mappedCategory: "other",
      suggestedSeverity: "medium",
    };

    let p = 0.85;
    if (idx === 0) p = Math.min(0.96, Math.max(0.72, 0.70 + (bestScore > 0 ? (sc / 20.0) * 0.25 : 0.15)));
    else if (idx === 1) p = Math.min(0.65, Math.max(0.35, 0.30 + (sc / 20.0) * 0.25));
    else p = Math.min(0.40, Math.max(0.15, 0.15 + (sc / 20.0) * 0.15));

    return {
      class: rawCls,
      rawClass: rawCls,
      label: meta.label,
      confidence: Math.round(p * 1000) / 1000,
      confidencePercentage: `${Math.round(p * 1000) / 10}%`,
      mappedCategory: meta.mappedCategory,
      suggestedSeverity: meta.suggestedSeverity,
    };
  });

  const best = top3[0];
  return {
    filename: "road.jpg",
    prediction: best.rawClass,
    confidence: best.confidence,
    low_confidence: best.confidence < 0.60,
    top_predictions: top3.map(t => ({ class: t.class, confidence: t.confidence })),
    success: true,
    rawClass: best.rawClass,
    label: best.label,
    confidencePercentage: best.confidencePercentage,
    mappedCategory: best.mappedCategory,
    suggestedSeverity: best.suggestedSeverity,
    topPredictions: top3,
    isLowConfidence: best.confidence < 0.60,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body.image || body.image_base64;
    const clientFeatures = body.features as ImageFeatures | undefined;

    if (!image && !clientFeatures) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    // 1. Try FastAPI ML engine (RD_API port 8000)
    if (image) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // Convert base64 to Blob and send multipart/form-data
        let fRes: Response | null = null;
        if (typeof image === "string" && image.startsWith("data:image")) {
          const parts = image.split(";base64,");
          if (parts.length === 2) {
            const mimeType = parts[0].replace("data:", "") || "image/jpeg";
            const buffer = Buffer.from(parts[1], "base64");
            const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
            const formData = new FormData();
            formData.append("file", blob, "road.jpg");

            fRes = await fetch(`${FASTAPI_URL}/predict`, {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });
          }
        }

        // If not base64 data URI, fallback to JSON body
        if (!fRes) {
          fRes = await fetch(`${FASTAPI_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
            signal: controller.signal,
          });
        }
        clearTimeout(timeoutId);

        if (fRes && fRes.ok) {
          const data = await fRes.json();
          if (data && (data.prediction || data.rawClass)) {
            return NextResponse.json({ success: true, data });
          }
        }
      } catch (fastApiErr) {
        // ML server unreachable; fall through to Python CLI or heuristic engine
      }
    }

    // 2. Direct Python classifier.py CLI fallback
    if (image) {
      try {
        const candidates = [
          path.resolve(process.cwd(), "..", "fastapi-backend", "classifier.py"),
          path.resolve(process.cwd(), "fastapi-backend", "classifier.py"),
          path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\DP-PROJECT\\fastapi-backend\\classifier.py"),
          path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\RD_API\\RD_API\\classifier.py"),
          path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\Backend\\classifier.py"),
        ];

        const scriptPath = candidates.find((p) => fs.existsSync(p));
        if (scriptPath) {
          const child = spawn("python", [scriptPath, "--stdin"]);
          let stdout = "";

          const result = await new Promise<any>((resolve) => {
            const timeout = setTimeout(() => {
              try { child.kill(); } catch (_) {}
              resolve(null);
            }, 4000);

            child.stdout.on("data", (d) => {
              stdout += d.toString();
            });

            child.on("close", (code) => {
              clearTimeout(timeout);
              if (code !== 0 || !stdout) return resolve(null);
              try {
                const s = stdout.indexOf("{");
                const e = stdout.lastIndexOf("}");
                if (s !== -1 && e !== -1) {
                  return resolve(JSON.parse(stdout.substring(s, e + 1)));
                }
              } catch (_) {}
              resolve(null);
            });

            child.on("error", () => {
              clearTimeout(timeout);
              resolve(null);
            });

            child.stdin.write(image);
            child.stdin.end();
          });

          if (result && (result.prediction || result.rawClass)) {
            return NextResponse.json({ success: true, data: result });
          }
        }
      } catch (pyErr) {
        // Python CLI fallback error
      }
    }

    // 3. Fallback classification with client features
    const pred = classifyFromFeatures(clientFeatures || {});
    return NextResponse.json({ success: true, data: pred });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Classification failed" },
      { status: 500 }
    );
  }
}
