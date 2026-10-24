"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import SeverityBadge from "@/components/shared/SeverityBadge";
import type { Severity } from "@/types";

interface PriorityAlertRowProps {
  title: string;
  description: string;
  timestamp: string;
  isUnresolvedFor48h: boolean;
  severity: Severity;
}

export const PriorityAlertRow: React.FC<PriorityAlertRowProps> = ({
  title,
  description,
  timestamp,
  isUnresolvedFor48h,
  severity,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-emerald-800/30 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="relative mt-1 flex h-6 w-6 items-center justify-center">
          {isUnresolvedFor48h ? (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500/30"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 0, 0.7],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                <AlertTriangle className="h-3 w-3" />
              </div>
            </>
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">
            {title}
          </h4>
          <p className="mt-0.5 text-xs text-muted truncate max-w-xs">
            {description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted">
            <Clock className="h-3 w-3" />
            <span>{timestamp}</span>
            {isUnresolvedFor48h && (
              <span className="ml-1 rounded bg-red-500/10 px-1.5 py-0.5 text-red-400 text-[10px] font-bold">
                Critical SLA
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <SeverityBadge severity={severity} />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-hover text-muted opacity-0 transition-opacity group-hover:opacity-100">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
};

export default PriorityAlertRow;
