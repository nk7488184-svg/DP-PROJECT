"use client";

import { categoryDistribution } from "@/lib/mock-data";
import { categoryLabels, categoryColors, type HazardCategory } from "@/types";
import DonutChartCenter from "@/components/ui/DonutChartCenter";

const data = categoryDistribution.map((d) => ({
  name: categoryLabels[d.category as HazardCategory],
  value: d.count,
  color: categoryColors[d.category as HazardCategory],
}));

export default function CategoryPieChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-full">
      <h3 className="text-sm font-semibold text-foreground mb-2">By Category</h3>
      <DonutChartCenter data={data} centerLabel="Reports" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
