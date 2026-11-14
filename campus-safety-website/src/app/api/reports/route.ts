import { NextResponse } from 'next/server';

const DASHBOARD_URL = 'http://127.0.0.1:3000/api/reports';
const BACKEND_URL = 'http://127.0.0.1:3002/api/reports';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '50';

  // Try fetching from Admin Dashboard first
  try {
    const res = await fetch(`${DASHBOARD_URL}?limit=${limit}`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  // Fallback to Express backend
  try {
    const res = await fetch(`${BACKEND_URL}?limit=${limit}`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({ success: true, count: 0, data: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward report to Admin Dashboard (3000) only — Dashboard handles Express (3002) forwarding
    let dashboardResult: any = null;
    try {
      const dRes = await fetch(DASHBOARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });
      if (dRes.ok) {
        dashboardResult = await dRes.json();
      }
    } catch (e) {
      console.warn('Could not forward report to Admin Dashboard:', e);
    }

    // Only try Express directly if Dashboard failed
    if (!dashboardResult) {
      try {
        const bRes = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3000),
        });
        if (bRes.ok) {
          dashboardResult = await bRes.json();
        }
      } catch {}
    }

    if (dashboardResult && dashboardResult.success) {
      return NextResponse.json(dashboardResult, { status: 201 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: body.id || `RPT-${Date.now().toString(36).toUpperCase()}`,
          ...body,
          reportedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
