"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import CampusMap from "@/components/map/CampusMap";
import { categoryLabels, categoryColors, type HazardCategory } from "@/types";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const categories: HazardCategory[] = [
  "pothole", "damaged_pavement", "faded_markings",
  "roadside_obstruction", "drainage_issue", "poor_lighting", "other",
];

export default function MapPage() {
  const [selectedCategories, setSelectedCategories] = useState<HazardCategory[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const toggleCategory = (cat: HazardCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 relative" style={{ height: "calc(100vh - 64px)" }}>
        {/* Filter Panel */}
        <div
          className={cn(
            "absolute top-4 left-4 z-[1000] bg-white rounded-xl shadow-lg transition-all",
            showFilters ? "p-5 w-64" : "p-0 w-auto"
          )}
        >
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              showFilters ? "mb-4" : "p-3"
            )}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Filters" : ""}
          </button>

          {showFilters && (
            <>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoryColors[cat] }}
                    />
                    {categoryLabels[cat]}
                  </label>
                ))}
              </div>

              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>

        {/* Map */}
        <CampusMap
          filterCategories={selectedCategories.length ? selectedCategories : undefined}
          className="w-full h-full"
        />
      </main>
    </>
  );
}
