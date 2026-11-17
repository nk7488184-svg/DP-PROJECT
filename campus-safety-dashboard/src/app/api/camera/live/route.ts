import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${fastApiUrl}/api/v1/camera/live`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return new Response("Camera snapshot unavailable", { status: 503 });
    }

    const blob = await res.blob();
    return new Response(blob, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    return new Response(`Snapshot proxy error: ${err.message}`, { status: 502 });
  }
}
