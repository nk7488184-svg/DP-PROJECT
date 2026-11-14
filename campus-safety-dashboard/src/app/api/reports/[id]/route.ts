import { NextResponse } from 'next/server';
import { mockReports } from '@/lib/mock-data';
import { HazardReport } from '@/types';

declare global {
  var __REPORTS_CACHE__: HazardReport[] | undefined;
}

if (!global.__REPORTS_CACHE__) {
  global.__REPORTS_CACHE__ = [...mockReports];
}

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
  let report = global.__REPORTS_CACHE__?.find((r) => r.id === id);

  // If not found in Next.js cache, query Express backend on port 3002
  if (!report) {
    try {
      const bRes = await fetch(`http://127.0.0.1:3002/api/reports/${id}`, { signal: AbortSignal.timeout(1200) });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData && bData.data) {
          report = bData.data;
          global.__REPORTS_CACHE__?.unshift(bData.data);
        }
      }
    } catch {}
  }

  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json({ success: true, data: report }, { headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await request.json();
    if (!global.__REPORTS_CACHE__) {
      global.__REPORTS_CACHE__ = [...mockReports];
    }
    const list = global.__REPORTS_CACHE__;
    const idx = list.findIndex((r) => r.id === id);

    let updatedReport: HazardReport;

    if (idx === -1) {
      updatedReport = {
        id,
        title: updates.title || 'Hazard Report',
        description: updates.description || '',
        category: updates.category || 'Pothole_Surface_Breakout',
        severity: updates.severity || 'medium',
        status: updates.status || 'submitted',
        location: updates.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
        images: updates.images || [],
        reportedBy: 'Campus Reporter',
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priorityScore: 50,
        ...updates,
      };
      list.unshift(updatedReport);
    } else {
      list[idx] = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      updatedReport = list[idx];
    }

    // Forward status/severity update to Express backend (port 3002)
    try {
      fetch(`http://127.0.0.1:3002/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    } catch {}

    // Forward status/severity update to Public Website (port 3001)
    try {
      fetch(`http://127.0.0.1:3001/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, data: updatedReport }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400, headers: corsHeaders });
  }
}
