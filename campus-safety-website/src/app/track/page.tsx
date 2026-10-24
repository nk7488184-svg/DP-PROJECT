"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import CategoryIcon from "@/components/shared/CategoryIcon";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels } from "@/types";
import {
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const timelineSteps = [
  { key: "submitted", label: "Submitted", icon: FileCheck },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "in_progress", label: "In Progress", icon: Loader2 },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
];

const statusOrder = ["submitted", "under_review", "in_progress", "resolved"];

export default function TrackPage() {
  const [searchId, setSearchId] = useState("");
  const [report, setReport] = useState<(typeof mockReports)[0] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("id");
      if (urlId) {
        setSearchId(urlId);
        executeSearch(urlId);
      }
    }
  }, []);

  const executeSearch = async (term: string) => {
    if (!term) return;
    setLoading(true);
    setNotFound(false);

    try {
      const { fetchFromApi } = await import("@/lib/api");
      const res = await fetchFromApi(`/reports/${term}`);
      if (res.success && res.data) {
        const d = res.data;
        const normalized = {
          ...d,
          id: d.id || d._id || term,
          location: d.location || { lat: 31.7754, lng: 76.9861, address: "IIT Mandi Campus" },
          category: d.category || "other",
          severity: d.severity || "medium",
          status: d.status || "submitted",
          reportedAt: d.reportedAt || new Date().toISOString(),
          description: d.description || "Hazard reported on campus road.",
          images: d.images || [],
        };
        setReport(normalized);
        setNotFound(false);
        return;
      }
    } catch (err) {
      // If backend reports error, try local mock fallback
    } finally {
      setLoading(false);
    }

    const found = mockReports.find(
      (r) => r.id.toLowerCase() === term.toLowerCase()
    );
    if (found) {
      setReport({
        ...found,
        location: found.location || { lat: 31.7754, lng: 76.9861, address: "IIT Mandi Campus" },
      });
      setNotFound(false);
    } else {
      setReport(null);
      setNotFound(true);
    }
  };

  const handleSearch = () => {
    executeSearch(searchId.trim());
  };

  const currentIdx = report ? statusOrder.indexOf(report.status) : -1;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Report</h1>
          <p className="text-muted mb-8">
            Enter your report ID to check its current status.
          </p>

          {/* Search */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Enter Report ID (e.g. RPT-1001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Search
            </button>
          </div>

          {!report && !notFound && (
            <p className="text-sm text-muted">
              Try searching for: <button onClick={() => { setSearchId("RPT-1001"); }} className="text-primary font-medium hover:underline">RPT-1001</button>
            </p>
          )}

          {notFound && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mt-4">
              No report found with ID &quot;{searchId}&quot;. Please check the ID and try again.
            </div>
          )}

          {/* Report Details */}
          {report && (
            <div className="mt-8 space-y-6">
              {/* Timeline */}
              <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-lg mb-6">Status Timeline</h2>
                <div className="space-y-0">
                  {timelineSteps.map((step, i) => {
                    const Icon = step.icon;
                    const isCompleted = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={step.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                              isCurrent
                                ? "bg-primary text-white ring-4 ring-primary/20"
                                : isCompleted
                                ? "bg-primary text-white"
                                : "bg-gray-200 text-gray-400"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {i < timelineSteps.length - 1 && (
                            <div className={cn("w-0.5 h-10", isCompleted ? "bg-primary" : "bg-gray-200")} />
                          )}
                        </div>
                        <div className="pb-8">
                          <p className={cn("font-medium text-sm", isCompleted ? "text-foreground" : "text-muted")}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-primary mt-0.5">Current status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-lg mb-4">Report Details</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={report.category} className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Category</p>
                      <p className="font-medium text-sm">{categoryLabels[report.category] || report.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Location</p>
                      <div>
                        <p className="font-medium text-sm text-foreground">{report.location?.address || "IIT Mandi Campus"}</p>
                        {report.location?.lat && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted font-mono bg-gray-100 px-2 py-0.5 rounded">
                              GPS: {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
                            </span>
                            <Link
                              href={`/map?lat=${report.location.lat}&lng=${report.location.lng}&reportId=${report.id}`}
                              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                            >
                              View on Campus Map ↗
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Reported On</p>
                      <p className="font-medium text-sm">
                        {report.reportedAt ? new Date(report.reportedAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }) : "Recently"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <StatusBadge status={report.status} />
                    <SeverityBadge severity={report.severity} />
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted mb-1">Description</p>
                    <p className="text-sm text-foreground">{report.description || "No description provided."}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
