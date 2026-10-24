"use client";

import { LineChart } from "@/components/charts/line-chart";
import { Line } from "@/components/charts/line";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
// Mock data for the resolution trends
const data = [
  { date: "2026-07-07", days: 4.2 },
  { date: "2026-07-14", days: 3.8 },
  { date: "2026-07-21", days: 5.1 },
  { date: "2026-07-28", days: 2.9 },
  { date: "2026-08-04", days: 3.4 },
  { date: "2026-08-11", days: 2.1 },
  { date: "2026-08-18", days: 2.8 },
  { date: "2026-08-25", days: 1.5 },
];

export default function TrendChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-sm w-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Resolution Speed</h3>
          <p className="text-sm text-muted">Average time to resolve reported hazards</p>
        </div>
      </div>
      <div className="w-full overflow-hidden mt-2" style={{ height: 400 }}>
        <LineChart data={data} xDataKey="date" aspectRatio="auto" className="h-full w-full">
          <Grid horizontal vertical={false} />
          
          <Line 
            dataKey="days" 
            stroke="#059669" // emerald primary color
          />
          
          <XAxis />
          
          <ChartTooltip />
        </LineChart>
      </div>
    </div>
  );
}
