"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DashboardKPICardProps {
  title: string;
  value: number;
  trendPercentage: number;
  sparklineData: { value: number }[];
  prefix?: string;
  isHero?: boolean;
}

export const DashboardKPICard: React.FC<DashboardKPICardProps> = ({
  title,
  value,
  trendPercentage,
  sparklineData,
  prefix = "",
  isHero = false,
}) => {
  const isPositive = trendPercentage >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border shadow-sm ${
        isHero
          ? "h-44 border-emerald-800/60 bg-emerald-950/80"
          : "h-36 border-border bg-card"
      }`}
    >
      <div className={isHero ? "px-6 pt-5" : "px-5 pt-5"}>
        <h3 className={`text-sm font-medium ${isHero ? "text-emerald-400/80" : "text-muted"}`}>
          {title}
        </h3>
        <div className="mt-1 flex items-baseline gap-3">
          <span className={`font-bold tracking-tight ${
            isHero ? "text-4xl text-white" : "text-3xl text-foreground"
          }`}>
            {prefix}
            {Math.floor(displayValue).toLocaleString()}
          </span>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center text-sm font-semibold ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <TrendIcon className="mr-0.5 h-4 w-4" />
            {Math.abs(trendPercentage)}%
          </motion.div>
        </div>
      </div>

      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default DashboardKPICard;
