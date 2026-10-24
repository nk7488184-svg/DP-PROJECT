"use client";

import { mockReports } from "@/lib/mock-data";
import { FunnelChart } from "@/components/charts/funnel-chart";

export default function StatusFunnelChart() {
  const submitted = mockReports.length;
  const underReview = mockReports.filter((r) => r.status !== "submitted").length;
  const inProgress = mockReports.filter(
    (r) => r.status === "in_progress" || r.status === "resolved"
  ).length;
  const resolved = mockReports.filter((r) => r.status === "resolved").length;

  const data = [
    { label: "Submitted", value: submitted, displayValue: submitted.toString() },
    { label: "Reviewed", value: underReview, displayValue: underReview.toString() },
    { label: "Action Taken", value: inProgress, displayValue: inProgress.toString() },
    { label: "Resolved", value: resolved, displayValue: resolved.toString() },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          Resolution Funnel
        </h3>
        <p className="text-sm text-muted">Tracking report progression</p>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-[220px]">
        <FunnelChart 
          data={data} 
          orientation="horizontal" 
          color="#10b981" 
          layers={3}
          showPercentage={true}
          showValues={true}
          showLabels={true}
          gap={4}
        />
      </div>
    </div>
  );
}
