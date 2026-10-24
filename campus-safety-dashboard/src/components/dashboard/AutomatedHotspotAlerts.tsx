"use client";

import { AlertTriangle, MapPin, Send } from "lucide-react";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels } from "@/types";

export default function AutomatedHotspotAlerts() {
  // Simple clustering logic: Find locations with >= 2 reports of the same category
  const activeReports = mockReports.filter(r => r.status !== "resolved");
  
  const clusters: Record<string, typeof activeReports> = {};
  
  activeReports.forEach((report) => {
    // Creating a pseudo-coordinate key by rounding lat/lng to group nearby ones, 
    // but since mock locations are exact addresses, we'll just group by address for this demo.
    const key = `${report.location.address}-${report.category}`;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(report);
  });

  const hotspots = Object.values(clusters)
    .filter(group => group.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (hotspots.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
        <AlertTriangle className="w-4 h-4" /> AI Automated Alerts
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hotspots.slice(0, 2).map((hotspot, idx) => {
          const category = hotspot[0].category;
          const address = hotspot[0].location.address;
          const count = hotspot.length;
          
          return (
            <div key={idx} className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-4 flex gap-4 items-start shadow-sm">
              <div className="bg-emerald-900/40 p-2 rounded-full mt-1 shrink-0">
                <AlertTriangle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-100 flex items-center gap-2">
                  High frequency of {categoryLabels[category]}
                </h4>
                <p className="text-xs text-emerald-200/70 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 opacity-70" />
                  {address}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {count} reports detected
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 opacity-80">
                    <Send className="w-3 h-3" /> Auto-escalated to authorities
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
