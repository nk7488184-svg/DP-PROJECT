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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // Sync with Express backend on port 3002 if running
  try {
    const backendRes = await fetch('http://127.0.0.1:3002/api/reports?limit=100', {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1000),
    });
    if (backendRes.ok) {
      const bData = await backendRes.json();
      if (bData && Array.isArray(bData.data)) {
        const existingIds = new Set((global.__REPORTS_CACHE__ || []).map((r) => r.id));
        for (const r of bData.data) {
          if (r && r.id && !existingIds.has(r.id)) {
            existingIds.add(r.id);
            global.__REPORTS_CACHE__?.unshift(r);
          }
        }
      }
    }
  } catch {}

  const list = global.__REPORTS_CACHE__ || [];
  const data = list.slice(0, limit);
  return NextResponse.json(
    {
      success: true,
      count: data.length,
      data,
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newReport: HazardReport = {
      id: body.id || `RPT-${Date.now().toString(36).toUpperCase()}`,
      title: body.title || 'Hazard Report',
      description: body.description || '',
      category: body.category || 'Pothole_Surface_Breakout',
      severity: body.severity || 'medium',
      status: body.status || 'submitted',
      location: body.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
      images: body.images || [],
      reportedBy: body.reportedBy || 'Campus Reporter',
      reportedAt: body.reportedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priorityScore: body.priorityScore || 50,
      mlPrediction: body.mlPrediction || undefined,
    };

    if (!global.__REPORTS_CACHE__) {
      global.__REPORTS_CACHE__ = [...mockReports];
    }
    // Check if duplicate ID exists, if so update it; otherwise unshift to top
    const existingIdx = global.__REPORTS_CACHE__.findIndex((r) => r.id === newReport.id);
    if (existingIdx !== -1) {
      global.__REPORTS_CACHE__[existingIdx] = newReport;
    } else {
      global.__REPORTS_CACHE__.unshift(newReport);
    }

    // Also forward to Express backend (3002) asynchronously if online
    try {
      fetch('http://127.0.0.1:3002/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, data: newReport }, { status: 201, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400, headers: corsHeaders });
  }
}
