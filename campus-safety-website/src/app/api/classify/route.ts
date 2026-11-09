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
  Vegetation_Moss: { label: "Vegetation & Moss", mappedCategory: "vegetation", suggestedSeverity: "low" },
  Pothole_Surface_Breakout: { label: "Pothole", mappedCategory: "pothole", suggestedSeverity: "high" },
  Longitudinal_Crack: { label: "Longitudinal Crack", mappedCategory: "road_cracks", suggestedSeverity: "medium" },
  Transverse_Crack: { label: "Transverse Crack", mappedCategory: "road_cracks", suggestedSeverity: "medium" },
  "Map(Block)_Cracking": { label: "Map / Block Cracking", mappedCategory: "road_cracks", suggestedSeverity: "medium" },
  Edge_Shoulder_Damage: { label: "Edge & Shoulder Damage", mappedCategory: "edge_damage", suggestedSeverity: "medium" },
  Debris_on_road: { label: "Debris on Road", mappedCategory: "debris_on_road", suggestedSeverity: "medium" },
  Iron_grid_damage: { label: "Drainage / Iron Grid", mappedCategory: "drainage_iron_grid", suggestedSeverity: "high" },
  Broken_Staircase: { label: "Broken Curbside / Steps", mappedCategory: "broken_curb", suggestedSeverity: "high" },
  Paver_Damage: { label: "Damaged Pavement / Pavers", mappedCategory: "damaged_pavement", suggestedSeverity: "medium" },
  Patch_Repair: { label: "Patch Repair", mappedCategory: "patch_deterioration", suggestedSeverity: "low" },
  Raveling_Loose_Aggregate: { label: "Loose Aggregate / Rubble", mappedCategory: "loose_aggregate", suggestedSeverity: "medium" },
  Rubble_Unpaved_surface: { label: "Rubble / Unpaved Surface", mappedCategory: "loose_aggregate", suggestedSeverity: "medium" },
};

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

  // Softmax
  const expScores: Record<string, number> = {};
  let totalExp = 0;
  for (const [k, v] of Object.entries(scores)) {
    const ev = Math.exp(v);
    expScores[k] = ev;
    totalExp += ev;
  }

  const sorted = Object.entries(expScores)
    .map(([k, v]) => ({
      rawClass: k,
      prob: v / totalExp,
    }))
    .sort((a, b) => b.prob - a.prob);

  const topPredictions = sorted.slice(0, 3).map((item) => {
    const meta = CLASS_METADATA[item.rawClass] || { label: item.rawClass.replace(/_/g, " "), mappedCategory: "other", suggestedSeverity: "medium" };
    return {
      rawClass: item.rawClass,
      label: meta.label,
      confidence: Math.round(item.prob * 1000) / 1000,
      confidencePercentage: `${(item.prob * 100).toFixed(1)}%`,
      mappedCategory: meta.mappedCategory,
    };
  });

  const best = topPredictions[0];
  const bestMeta = CLASS_METADATA[best.rawClass] || { label: best.label, mappedCategory: "other", suggestedSeverity: "medium" };

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body.image || body.image_base64;
    const clientFeatures = body.features as ImageFeatures | undefined;

    if (!image && !clientFeatures) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    // 1. Try FastAPI ML engine if running (port 8000, ~15ms)
    if (image) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const fRes = await fetch("http://127.0.0.1:8000/api/v1/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (fRes.ok) {
          const data = await fRes.json();
          if (data && data.success) {
            return NextResponse.json({ success: true, data });
          }
        }
      } catch (fastApiErr) {
        // FastAPI offline; fall through
      }
    }

    // 2. If client provided high-fidelity canvas pixel features, classify with balanced multi-class engine
    if (clientFeatures && typeof clientFeatures.greenRatio === "number") {
      const pred = classifyFromFeatures(clientFeatures);
      return NextResponse.json({ success: true, data: pred });
    }

    // 3. Try direct python classifier.py CLI if python environment is present
    if (image) {
      try {
        const candidates = [
          path.resolve(process.cwd(), "..", "fastapi-backend", "classifier.py"),
          path.resolve(process.cwd(), "fastapi-backend", "classifier.py"),
          path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\DP-PROJECT\\fastapi-backend\\classifier.py"),
          path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\RoadSentinel\\fastapi-backend\\classifier.py"),
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
            }, 3000);

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

          if (result && result.success) {
            return NextResponse.json({ success: true, data: result });
          }
        }
      } catch (pyErr) {
        // Python CLI not available; fall through
      }
    }

    // 4. Fallback classification with client features or default features
    const pred = classifyFromFeatures(clientFeatures || {});
    return NextResponse.json({ success: true, data: pred });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Classification failed" },
      { status: 500 }
    );
  }
}
