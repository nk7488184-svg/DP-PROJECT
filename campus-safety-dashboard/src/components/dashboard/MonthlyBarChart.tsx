"use client";

import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { monthlyTrends } from "@/lib/mock-data";

export default function MonthlyBarChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Monthly Trends</h3>
          <p className="text-sm text-muted">Submitted vs Resolved Hazards</p>
        </div>
      </div>
      <div className="w-full overflow-hidden" style={{ height: 300 }}>
        <BarChart
          data={monthlyTrends}
          xDataKey="month"
          aspectRatio="auto"
          className="h-full w-full"
        >
          <Grid horizontal vertical={false} />

          <Bar dataKey="submitted" fill="#34d399" lineCap="round" />
          <Bar dataKey="resolved" fill="#059669" lineCap="round" />

          <BarXAxis />
          <BarYAxis />

          <ChartTooltip />
        </BarChart>
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center gap-6 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#34d399" }} />
          <span className="text-xs text-muted font-medium">Submitted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#059669" }} />
          <span className="text-xs text-muted font-medium">Resolved</span>
        </div>
      </div>
    </div>
  );
}
