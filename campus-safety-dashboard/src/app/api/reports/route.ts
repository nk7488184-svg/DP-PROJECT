import { NextResponse } from 'next/server';
import { mockReports } from '@/lib/mock-data';
import { HazardReport } from '@/types';

declare global {
  var __REPORTS_CACHE__: HazardReport[] | undefined;
}

// Restore baseline reports cache
global.__REPORTS_CACHE__ = [...mockReports];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const list = global.__REPORTS_CACHE__ || [];
  const data = list.slice(0, limit);
  return NextResponse.json({
    success: true,
    count: data.length,
    data,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newReport: HazardReport = {
      id: `RPT-${Date.now().toString(36).toUpperCase()}`,
      title: body.title || 'Hazard Report',
      description: body.description || '',
      category: body.category || 'Pothole_Surface_Breakout',
      severity: body.severity || 'medium',
      status: body.status || 'submitted',
      location: body.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
      images: body.images || [],
      reportedBy: body.reportedBy || 'Campus Reporter',
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priorityScore: body.priorityScore || 50,
      mlPrediction: body.mlPrediction || undefined,
    };
    if (!global.__REPORTS_CACHE__) {
      global.__REPORTS_CACHE__ = [...mockReports];
    }
    global.__REPORTS_CACHE__.unshift(newReport);
    return NextResponse.json({ success: true, data: newReport });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
