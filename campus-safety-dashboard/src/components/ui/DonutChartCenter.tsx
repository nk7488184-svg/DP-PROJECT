"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
}

export const DonutChartCenter: React.FC<DonutChartProps> = ({ data, centerLabel }) => {
  const totalValue = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1200}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#f1f5f9",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring", bounce: 0.4 }}
          className="text-center"
        >
          <span className="block text-3xl font-extrabold text-foreground">
            {totalValue.toLocaleString()}
          </span>
          <span className="block text-xs font-bold uppercase tracking-wider text-muted">
            {centerLabel}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default DonutChartCenter;
