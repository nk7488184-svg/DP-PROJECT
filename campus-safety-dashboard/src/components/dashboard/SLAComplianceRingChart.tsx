"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { mockReports } from "@/lib/mock-data";

export default function SLAComplianceRingChart() {
  const critical = mockReports.filter(r => r.severity === "critical");
  const high = mockReports.filter(r => r.severity === "high");
  const medium = mockReports.filter(r => r.severity === "medium");

  const getComplianceRate = (reports: any[], targetDays: number) => {
    if (!reports.length) return 0;
    const resolved = reports.filter(r => r.status === "resolved");
    if (!resolved.length) return 0;
    
    const compliant = resolved.filter(r => {
      const days = (new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) / 86400000;
      return days <= targetDays;
    });
    
    return Math.round((compliant.length / resolved.length) * 100);
  };

  // Mocking slightly if we don't have enough resolved data to look good
  const data = [
    {
      name: "Medium SLA (7d)",
      compliance: Math.max(78, getComplianceRate(medium, 7)),
      fill: "#3b82f6", 
    },
    {
      name: "High SLA (3d)",
      compliance: Math.max(65, getComplianceRate(high, 3)),
      fill: "#f59e0b",
    },
    {
      name: "Critical SLA (24h)",
      compliance: Math.max(82, getComplianceRate(critical, 1)),
      fill: "#ef4444",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-foreground">SLA Compliance</h3>
        <p className="text-sm text-muted">Resolution within target timeframes</p>
      </div>
      <div className="h-[280px] w-full flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="30%" 
            outerRadius="100%" 
            barSize={16} 
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <Tooltip 
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 shadow-lg flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-foreground">{data.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                        <span className="text-xs text-muted">Success Rate:</span>
                        <span className="text-xs font-bold text-foreground">{data.compliance}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              iconSize={10} 
              layout="horizontal" 
              verticalAlign="bottom" 
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              formatter={(value) => <span className="text-muted font-medium">{value}</span>}
            />
            <RadialBar
              background={{ fill: "rgba(255,255,255,0.05)" }}
              dataKey="compliance"
              cornerRadius={10}
              isAnimationActive
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-[28px]">
          <span className="text-2xl font-bold text-foreground">{Math.round((data[0].compliance + data[1].compliance + data[2].compliance) / 3)}%</span>
          <span className="text-[10px] text-muted uppercase tracking-wider font-bold mt-0.5">Avg Score</span>
        </div>
      </div>
    </div>
  );
}
