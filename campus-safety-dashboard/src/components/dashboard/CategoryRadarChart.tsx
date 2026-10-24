"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory } from "@/types";

export default function CategoryRadarChart() {
  // Calculate average severity score for each category
  const categories = Object.keys(categoryLabels) as HazardCategory[];
  
  const data = categories.map((cat) => {
    const catReports = mockReports.filter(r => r.category === cat);
    const avgScore = catReports.length 
      ? catReports.reduce((acc, curr) => acc + curr.priorityScore, 0) / catReports.length 
      : 0;
      
    return {
      category: categoryLabels[cat].split(" ")[0], // Use first word for brevity on axis
      fullCategory: categoryLabels[cat],
      score: Math.round(avgScore),
      reports: catReports.length
    };
  }).filter(d => d.reports > 0); // Only show categories that have reports

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-foreground">Risk Profiler</h3>
        <p className="text-sm text-muted">Average severity by category</p>
      </div>
      <div className="h-[280px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fill: "#a1a1aa", fontSize: 11 }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickCount={5}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 shadow-lg flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-foreground">{data.fullCategory}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted">Avg Severity:</span>
                        <span className="text-xs font-bold text-foreground">{data.score}/100</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Radar
              name="Severity Score"
              dataKey="score"
              stroke="#10b981"
              fill="#34d399"
              fillOpacity={0.3}
              isAnimationActive
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
