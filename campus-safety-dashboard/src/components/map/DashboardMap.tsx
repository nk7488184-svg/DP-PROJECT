"use client";

import dynamic from "next/dynamic";

const DashboardMapInner = dynamic(() => import("./DashboardMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-card animate-pulse rounded-xl flex items-center justify-center min-h-[500px]">
      <p className="text-muted text-sm">Loading GIS campus map…</p>
    </div>
  ),
});

export default function DashboardMap({
  filterCategories,
  filterSeverities,
  showResolved,
  showHeatmap,
  className,
}: {
  filterCategories?: string[];
  filterSeverities?: string[];
  showResolved?: boolean;
  showHeatmap?: boolean;
  className?: string;
}) {
  return (
    <div className={className ?? "w-full h-full min-h-[500px] rounded-xl overflow-hidden"}>
      <DashboardMapInner
        filterCategories={filterCategories}
        filterSeverities={filterSeverities}
        showResolved={showResolved}
        showHeatmap={showHeatmap}
      />
    </div>
  );
}
