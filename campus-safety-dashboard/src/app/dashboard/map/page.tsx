"use client";

import { useState } from "react";
import { categoryLabels, categoryColors, severityLabels, type HazardCategory, type Severity } from "@/types";
import { Filter, Eye, EyeOff } from "lucide-react";
import DashboardMap from "@/components/map/DashboardMap";

const categories = Object.keys(categoryLabels) as HazardCategory[];
const severities = Object.keys(severityLabels) as Severity[];

export default function DashboardMapPage() {
  const [selectedCategories, setSelectedCategories] = useState<HazardCategory[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const toggleCategory = (cat: HazardCategory) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities((prev) => prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar Filters */}
      <div className="w-full lg:w-64 bg-card border border-border rounded-xl p-5 flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Filter className="w-4 h-4" />
            GIS Map Filters
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-medium">
            LIVE GIS
          </span>
        </div>

        {/* Status visibility toggle */}
        <div className="p-3 bg-input border border-border rounded-lg flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted uppercase">Status Visibility</span>
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
              showResolved
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-muted/10 text-muted border-border hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {showResolved ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showResolved ? "Showing Resolved" : "Resolved Hidden"}</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {showResolved ? "ON" : "OFF"}
            </span>
          </button>
          <span className="text-[10px] text-muted">
            {showResolved
              ? "All reports including resolved are visible."
              : "Resolved hazards are automatically hidden."}
          </span>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted uppercase mb-3">Hazard Categories</h4>
          <div className="space-y-2">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="w-4 h-4 rounded border-border bg-input accent-primary"
                />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[cat] }} />
                {categoryLabels[cat]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted uppercase mb-3">Severity</h4>
          <div className="space-y-2">
            {severities.map((sev) => (
              <label key={sev} className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes(sev)}
                  onChange={() => toggleSeverity(sev)}
                  className="w-4 h-4 rounded border-border bg-input accent-primary"
                />
                {severityLabels[sev]}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
          <div className="text-xs text-muted mb-1">
            <strong>GIS Layers Active:</strong> Roads, Pedestrian Paths, Buildings, Grounds & Boundaries from North & South Campus.
          </div>
          <button 
            onClick={() => { setSelectedCategories([]); setSelectedSeverities([]); setShowResolved(false); }}
            className="text-xs text-muted hover:text-foreground hover:underline py-1 text-center"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Interactive GIS Map Area */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
        <DashboardMap
          filterCategories={selectedCategories}
          filterSeverities={selectedSeverities}
          showResolved={showResolved}
          showHeatmap={showHeatmap}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
