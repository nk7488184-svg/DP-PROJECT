import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${fastApiUrl}/api/v1/camera/stream`, {
      cache: "no-store",
    });

    if (!res.ok || !res.body) {
      return new Response("Camera stream unavailable", { status: 503 });
    }

    return new Response(res.body as any, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    return new Response(`Stream proxy error: ${err.message}`, { status: 502 });
  }
}
