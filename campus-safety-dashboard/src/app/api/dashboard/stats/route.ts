import { NextResponse } from 'next/server';
import { mockReports } from '@/lib/mock-data';
import { HazardReport, DashboardStats } from '@/types';

declare global {
  var __REPORTS_CACHE__: HazardReport[] | undefined;
}

export async function GET() {
  const reports = global.__REPORTS_CACHE__ || [];

  const stats: DashboardStats = {
    totalReports: reports.length,
    pending: reports.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    criticalCount: reports.filter((r) => r.severity === "critical").length,
    avgResolutionDays: reports.length > 0 ? 4.2 : 0,
  };

  return NextResponse.json({
    success: true,
    data: stats,
  });
}
