"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { timeSeriesData } from "@/lib/mock-data";

export default function TrendChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Reports Over Time</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={timeSeriesData}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.5} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141415", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa" }}
            labelStyle={{ color: "#a1a1aa", fontSize: "12px", marginBottom: "4px" }}
            itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
          />
          <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#colorCount)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
