import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body.image || body.image_base64;
    if (!image) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    // 1. Try FastAPI ML engine first if running (port 8000, model pre-warmed in memory)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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
      // FastAPI offline; fall through to direct python CLI
    }

    // 2. Fallback: Run classifier.py directly with python via stdin
    const candidates = [
      path.resolve(process.cwd(), "..", "fastapi-backend", "classifier.py"),
      path.resolve(process.cwd(), "fastapi-backend", "classifier.py"),
      path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\DP-PROJECT\\fastapi-backend\\classifier.py"),
      path.resolve("C:\\Users\\nk748\\OneDrive\\Desktop\\Backend\\classifier.py"),
    ];

    const scriptPath = candidates.find((p) => fs.existsSync(p)) || candidates[0];

    const child = spawn("python", [scriptPath, "--stdin"]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const result = await new Promise<any>((resolve) => {
      child.on("close", (code) => {
        if (code !== 0 || !stdout) {
          return resolve(null);
        }
        try {
          const s = stdout.indexOf("{");
          const e = stdout.lastIndexOf("}");
          if (s !== -1 && e !== -1) {
            return resolve(JSON.parse(stdout.substring(s, e + 1)));
          }
        } catch (_) {}
        resolve(null);
      });

      child.on("error", () => resolve(null));

      // Stream image payload into python process stdin
      child.stdin.write(image);
      child.stdin.end();
    });

    if (result && result.success) {
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Model inference returned no result", detail: stderr },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
