import { NextResponse } from 'next/server';

const DASHBOARD_URL = 'http://127.0.0.1:3000/api/reports';
const BACKEND_URL = 'http://127.0.0.1:3002/api/reports';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Check Admin Dashboard on port 3000 first (where admin updates live)
  try {
    const dRes = await fetch(`${DASHBOARD_URL}/${id}`, { signal: AbortSignal.timeout(2000) });
    if (dRes.ok) {
      const data = await dRes.json();
      if (data && (data.data || data.success)) {
        return NextResponse.json(data, { headers: corsHeaders });
      }
    }
  } catch {}

  // 2. Fallback to Express backend on port 3002
  try {
    const bRes = await fetch(`${BACKEND_URL}/${id}`, { signal: AbortSignal.timeout(2000) });
    if (bRes.ok) {
      const data = await bRes.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }
  } catch {}

  return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404, headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Broadcast patch to Admin Dashboard (3000) and Backend (3002)
    let dashboardResult: any = null;
    try {
      const dRes = await fetch(`${DASHBOARD_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
      if (dRes.ok) {
        dashboardResult = await dRes.json();
      }
    } catch {}

    try {
      await fetch(`${BACKEND_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
    } catch {}

    if (dashboardResult) {
      return NextResponse.json(dashboardResult, { headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data: { id, ...body } }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: corsHeaders });
  }
}
