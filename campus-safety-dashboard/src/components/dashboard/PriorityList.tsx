"use client";

import { useEffect, useState } from "react";
import { mockReports } from "@/lib/mock-data";
import PriorityAlertRow from "@/components/ui/PriorityAlertRow";
import { AlertTriangle } from "lucide-react";
import { fetchFromApi } from "@/lib/api";

export default function PriorityList() {
  const [reports, setReports] = useState(mockReports);

  const loadPriority = () => {
    fetchFromApi('/dashboard/priority')
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setReports(res.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPriority();
    const interval = setInterval(loadPriority, 8000);
    return () => clearInterval(interval);
  }, []);

  const prioritized = [...reports]
    .filter((r) => r.status !== "resolved")
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Priority Alerts</h3>
      </div>
      <div className="space-y-3 flex-1">
        {prioritized.map((report) => {
          const repDate = report.reportedAt ? new Date(report.reportedAt).getTime() : Date.now();
          const daysAgo = Math.max(
            0,
            Math.floor((Date.now() - repDate) / 86400000)
          );
          const timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
          return (
            <PriorityAlertRow
              key={report.id || (report as any)._id}
              title={report.title}
              description={report.location?.address || "IIT Mandi Campus"}
              timestamp={timeLabel}
              isUnresolvedFor48h={daysAgo >= 2 && (report.severity === "critical" || report.severity === "high")}
              severity={report.severity}
            />
          );
        })}
      </div>
    </div>
  );
}
