"use client";

import { mockReports } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import { MapPin, ChevronDown } from "lucide-react";

export default function RecentReportRows() {
  const reports = mockReports.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {reports.map((report, idx) => (
        <div
          key={report.id}
          className={`group cursor-pointer transition-colors duration-300 hover:bg-gray-50 ${
            idx < reports.length - 1 ? "border-b border-gray-100" : ""
          }`}
        >
          {/* Row Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="font-semibold text-base text-gray-900 truncate">
                {report.title}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{report.location?.address || "IIT Mandi Campus"}</span>
                <span className="text-gray-300">•</span>
                <span className="flex-shrink-0">
                  {(() => {
                    const d = new Date(report.reportedAt);
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
                  })()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <SeverityBadge severity={report.severity} />
              <StatusBadge status={report.status} />
              <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-gray-900 group-hover:rotate-180 transition-all duration-400" />
            </div>
          </div>

          {/* Expandable Content (CSS grid expand on hover) */}
          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <div className="overflow-hidden">
              <div className="px-6 pb-5 pt-1">
                <div className="border-t border-dashed border-gray-200 pt-4 flex gap-4">
                  {/* Skeleton thumbnail with shimmer */}
                  <div className="w-20 h-[60px] rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2.5 justify-center">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-mono font-bold text-emerald-600">{report.id}</span>
                      <span className="text-gray-300">|</span>
                      <span>{categoryLabels[report.category as HazardCategory]}</span>
                      <span className="text-gray-300">|</span>
                      <span>Score: {Math.round(report.priorityScore)}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
