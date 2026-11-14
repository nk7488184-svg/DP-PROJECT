import { NextResponse } from 'next/server';
import { mockReports } from '@/lib/mock-data';
import { HazardReport } from '@/types';

declare global {
  var __REPORTS_CACHE__: HazardReport[] | undefined;
}

export async function GET() {
  const reports = global.__REPORTS_CACHE__ || [];

  const prioritized = [...reports]
    .filter((r) => r.status !== 'resolved')
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: prioritized,
  });
}
