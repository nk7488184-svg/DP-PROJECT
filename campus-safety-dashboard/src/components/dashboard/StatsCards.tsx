"use client";

import { useEffect, useState } from "react";
import { dashboardStats as fallbackStats } from "@/lib/mock-data";
import DashboardKPICard from "@/components/ui/DashboardKPICard";
import { fetchFromApi } from "@/lib/api";

// Generate mock sparkline data
function genSparkline(base: number, variance: number): { value: number }[] {
  return Array.from({ length: 7 }, () => ({
    value: Math.max(1, base + Math.floor(Math.random() * variance - variance / 2)),
  }));
}

export default function StatsCards() {
  const [stats, setStats] = useState(fallbackStats);

  const loadStats = () => {
    fetchFromApi('/dashboard/stats')
      .then((res) => {
        if (res.success && res.data) {
          setStats(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not load real-time stats, using cached stats", err);
      });
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    const onFocus = () => loadStats();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Total Hazards Logged"
          value={stats.totalReports}
          trendPercentage={12}
          sparklineData={genSparkline(stats.totalReports || 10, 4)}
          isHero
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Pending Review"
          value={stats.pending}
          trendPercentage={-5}
          sparklineData={genSparkline(stats.pending || 4, 2)}
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="In Progress"
          value={stats.inProgress}
          trendPercentage={8}
          sparklineData={genSparkline(stats.inProgress || 3, 2)}
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Resolved Issues"
          value={stats.resolved}
          trendPercentage={18}
          sparklineData={genSparkline(stats.resolved || 2, 2)}
        />
      </div>
    </div>
  );
}
