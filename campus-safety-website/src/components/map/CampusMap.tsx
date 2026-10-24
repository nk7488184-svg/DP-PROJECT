"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted text-sm font-medium">Loading campus map…</p>
    </div>
  ),
});

export default function CampusMap({
  filterCategories,
  className,
}: {
  filterCategories?: string[];
  className?: string;
}) {
  return (
    <div
      className={className ?? "w-full rounded-xl overflow-hidden relative"}
      style={{ height: "100%", minHeight: "500px" }}
    >
      <MapInner filterCategories={filterCategories} />
    </div>
  );
}
