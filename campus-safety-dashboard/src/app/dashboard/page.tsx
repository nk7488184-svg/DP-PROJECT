"use client";

import { useEffect, useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import TrendChart from "@/components/dashboard/TrendChart";
import CategoryPieChart from "@/components/dashboard/CategoryPieChart";
import PriorityList from "@/components/dashboard/PriorityList";
import AutomatedHotspotAlerts from "@/components/dashboard/AutomatedHotspotAlerts";
import { mockReports as fallbackReports } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory, type HazardReport } from "@/types";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { fetchFromApi } from "@/lib/api";

export default function DashboardOverview() {
  const [reports, setReports] = useState<HazardReport[]>(fallbackReports);

  const loadRecentReports = () => {
    fetchFromApi('/reports?limit=10')
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const normalized: HazardReport[] = res.data.map((r: any) => ({
            id: r.id || r._id || `RPT-${Math.floor(Math.random() * 9000)}`,
            title: r.title || 'Hazard Report',
            description: r.description || '',
            category: r.category || 'other',
            severity: r.severity || 'medium',
            status: r.status || 'submitted',
            location: r.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
            images: r.images || [],
            reportedBy: typeof r.reportedBy === 'object' ? r.reportedBy?.name || 'Campus Reporter' : r.reportedBy || 'Campus Reporter',
            reportedAt: r.reportedAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
            priorityScore: r.priorityScore || 50,
          }));
          setReports(normalized);
        }
      })
      .catch((err) => {
        console.warn("Could not load real-time reports feed:", err);
      });
  };

  useEffect(() => {
    loadRecentReports();
    const interval = setInterval(loadRecentReports, 5000);
    const onFocus = () => loadRecentReports();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const recentReports = reports.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
        <div className="text-sm text-muted" suppressHydrationWarning>
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </div>
      </div>

      <AutomatedHotspotAlerts />

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityList />
        
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Reports</h3>
            <Link href="/dashboard/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/40 flex-1">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-4 py-3 hover:bg-card-hover/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-primary">{report.id}</span>
                    <p className="text-sm font-semibold text-foreground truncate">{report.title}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1 min-w-0 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{report.location.address}</span>
                    </span>
                    <span className="text-muted/40">•</span>
                    <span className="flex-shrink-0">{categoryLabels[report.category as HazardCategory] || report.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <SeverityBadge severity={report.severity} />
                  <StatusBadge status={report.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
