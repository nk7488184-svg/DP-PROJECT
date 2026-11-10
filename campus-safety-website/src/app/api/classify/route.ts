import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export const CLASS_METADATA: Record<string, { label: string; mappedCategory: string; suggestedSeverity: string }> = {
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

const FASTAPI_URL = (process.env.ML_API_URL || process.env.FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");

function formatPredictionOutput(data: any) {
  const topClass = data.prediction || data.rawClass || (data.top_predictions?.[0]?.class) || "Pothole_Surface_Breakout";
  const conf = typeof data.confidence === "number" ? data.confidence : 0.85;
  const isLow = typeof data.low_confidence === "boolean" ? data.low_confidence : (typeof data.isLowConfidence === "boolean" ? data.isLowConfidence : conf < 0.60);
  const meta = CLASS_METADATA[topClass] || { label: topClass.replace(/_/g, " "), mappedCategory: topClass, suggestedSeverity: "medium" };

  const rawTopList = data.top_predictions || data.topPredictions || [];
  const topItems = rawTopList.map((item: any) => {
    const cls = item.class || item.rawClass || topClass;
    const cVal = typeof item.confidence === "number" ? item.confidence : conf;
    const cMeta = CLASS_METADATA[cls] || { label: cls.replace(/_/g, " "), mappedCategory: cls, suggestedSeverity: "medium" };
    return {
      class: cls,
      rawClass: cls,
      label: cMeta.label,
      confidence: Math.round(cVal * 10000) / 10000,
      confidencePercentage: `${Math.round(cVal * 1000) / 10}%`,
      mappedCategory: cls,
      suggestedSeverity: cMeta.suggestedSeverity,
    };
  });

  return {
    filename: data.filename || "road.jpg",
    prediction: topClass,
    confidence: Math.round(conf * 10000) / 10000,
    low_confidence: isLow,
    top_predictions: topItems.map((t: any) => ({ class: t.class, confidence: t.confidence })),
    success: true,
    rawClass: topClass,
    label: meta.label,
    confidencePercentage: `${Math.round(conf * 1000) / 10}%`,
    mappedCategory: topClass,
    suggestedSeverity: meta.suggestedSeverity,
    topPredictions: topItems,
    isLowConfidence: isLow,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body.image || body.image_base64;

    if (!image) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    // 1. Try dedicated FastAPI ML engine (port 8000)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
          return NextResponse.json({ success: true, data: formatPredictionOutput(data) });
        }
      }
    } catch (_) {}

    // 2. Try Express backend inference route
    try {
      const bRes = await fetch(`${BACKEND_URL}/reports/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData && bData.success && bData.data) {
          return NextResponse.json({ success: true, data: formatPredictionOutput(bData.data) });
        }
      }
    } catch (_) {}

    // 3. Fallback: Run PyTorch classifier.py directly with generous 25s timeout for CPU cold start
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
        }, 25000);

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
        return NextResponse.json({ success: true, data: formatPredictionOutput(result) });
      }
    }

    return NextResponse.json(
      { success: false, error: "ML Model inference service unavailable. Please check that PyTorch or FastAPI is running." },
      { status: 503 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Classification failed" },
      { status: 500 }
    );
  }
}
