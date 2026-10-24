"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { mockReports as fallbackReports } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory, type Status, type Severity, type HazardReport } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import { Search, ChevronLeft, ChevronRight, MapPin, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFromApi } from "@/lib/api";

export default function ReportsTable() {
  const [reports, setReports] = useState<HazardReport[]>(fallbackReports);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<HazardCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [sevFilter, setSevFilter] = useState<Severity | "">("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const perPage = 10;

  const loadReports = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    fetchFromApi('/reports?limit=50')
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const normalized: HazardReport[] = res.data.map((r: any) => ({
            id: r.id || r._id || `RPT-${Math.floor(Math.random() * 9000)}`,
            title: r.title || 'Hazard Report',
            description: r.description || '',
            category: r.category || 'other',
            severity: r.severity || 'medium',
            status: r.status || 'submitted',
            location: r.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
            images: r.images || [],
            reportedBy: typeof r.reportedBy === 'object' ? r.reportedBy?.name || 'Campus Reporter' : r.reportedBy || 'Campus Reporter',
            reportedAt: r.reportedAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
            priorityScore: r.priorityScore || 50,
          }));
          setReports(normalized);
        }
      })
      .catch((err) => {
        console.warn("Backend reports unreachable, using local reports store", err);
      })
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    loadReports(true);
    // Real-time live polling every 5 seconds
    const interval = setInterval(() => {
      loadReports(false);
    }, 5000);

    const onFocus = () => loadReports(false);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: Status) => {
    setStatusUpdating(true);
    try {
      await fetchFromApi(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      // Optimistic update
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.location.address.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && r.category !== catFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (sevFilter && r.severity !== sevFilter) return false;
      return true;
    });
  }, [reports, search, catFilter, statusFilter, sevFilter]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const selected = selectedId ? reports.find((r) => r.id === selectedId) : null;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value as HazardCategory | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as Status | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={sevFilter}
          onChange={(e) => { setSevFilter(e.target.value as Severity | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={() => loadReports(true)}
          title="Refresh"
          className="p-2 border border-border rounded-lg bg-input hover:bg-card-hover text-muted hover:text-foreground transition-colors flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-primary")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/10 text-muted uppercase text-[11px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    No reports match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedId(report.id)}
                    className="hover:bg-card-hover/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{report.title}</div>
                      <div className="text-xs text-muted font-mono">{report.id}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {categoryLabels[report.category as HazardCategory] || report.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={report.severity} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="w-3 h-3 text-muted shrink-0" />
                        <span className="truncate max-w-[180px]">{report.location.address}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(report.reportedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>
            Showing {filtered.length === 0 ? 0 : page * perPage + 1} to{" "}
            {Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border border-border disabled:opacity-30 hover:bg-card-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border border-border disabled:opacity-30 hover:bg-card-hover"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded-lg hover:bg-card-hover">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="space-y-3.5 text-sm">
              <div className="flex gap-2 items-center">
                <StatusBadge status={selected.status} />
                <SeverityBadge severity={selected.severity} />
              </div>
              <div>
                <p className="text-xs text-muted">ID</p>
                <p className="font-mono text-primary font-bold">{selected.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Category</p>
                <p className="text-foreground">{categoryLabels[selected.category as HazardCategory] || selected.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Location</p>
                <p className="text-foreground">{selected.location.address}</p>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <p className="text-xs text-muted font-mono">{selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}</p>
                  <Link
                    href={`/dashboard/map?lat=${selected.location.lat}&lng=${selected.location.lng}&reportId=${selected.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Show on map ↗
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted">Description</p>
                <p className="text-foreground bg-muted/10 p-3 rounded-lg border border-border">{selected.description || "No description provided."}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Reported</p>
                <p className="text-foreground">{new Date(selected.reportedAt).toLocaleString()}</p>
              </div>

              {/* Status Updater */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted mb-2">UPDATE STATUS</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["under_review", "in_progress", "resolved"] as Status[]).map((st) => (
                    <button
                      key={st}
                      disabled={statusUpdating || selected.status === st}
                      onClick={() => handleUpdateStatus(selected.id, st)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors",
                        selected.status === st
                          ? "bg-primary text-white border-primary cursor-default"
                          : "bg-input border-border text-foreground hover:bg-card-hover hover:border-primary/50",
                        statusUpdating && "opacity-50 cursor-wait"
                      )}
                    >
                      {st === "under_review" ? "Review" : st === "in_progress" ? "In Progress" : "Resolve"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
