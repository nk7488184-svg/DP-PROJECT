"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { mockReports as fallbackReports } from "@/lib/mock-data";
import { getAllMergedReports, updateLocalReport } from "@/lib/localReportsStore";
import { categoryLabels, type HazardCategory, type Status, type Severity, type HazardReport } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import { Search, ChevronLeft, ChevronRight, MapPin, X, RefreshCw, Sparkles, Image as ImageIcon, Loader2, AlertTriangle } from "lucide-react";
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
  const [severityUpdating, setSeverityUpdating] = useState(false);
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);
  const perPage = 10;

  const loadReports = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    fetchFromApi('/reports?limit=50')
      .then((res) => {
        let backendItems: HazardReport[] = [];
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          backendItems = res.data.map((r: any) => ({
            id: r.id || r._id || `RPT-${Math.floor(Math.random() * 9000)}`,
            title: r.title || 'Hazard Report',
            description: r.description || '',
            category: r.category || 'Pothole_Surface_Breakout',
            severity: r.severity || 'medium',
            status: r.status || 'submitted',
            location: r.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
            images: r.images || [],
            reportedBy: typeof r.reportedBy === 'object' ? r.reportedBy?.name || 'Campus Reporter' : r.reportedBy || 'Campus Reporter',
            reportedAt: r.reportedAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
            priorityScore: r.priorityScore || 50,
            mlPrediction: r.mlPrediction || undefined,
          }));
        }
        setReports(getAllMergedReports(backendItems));
      })
      .catch((err) => {
        setReports(getAllMergedReports([]));
      })
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  }, []);

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
  }, [loadReports]);

  const handleUpdateStatus = async (reportId: string, newStatus: Status) => {
    setStatusUpdating(true);
    try {
      await fetchFromApi(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      // Optimistic update & local storage sync
      updateLocalReport(reportId, { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Admin capability to edit/override severity according to requirements
  const handleUpdateSeverity = async (reportId: string, newSeverity: Severity) => {
    setSeverityUpdating(true);
    try {
      await fetchFromApi(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ severity: newSeverity }),
      });
      // Optimistic update & local storage sync
      updateLocalReport(reportId, { severity: newSeverity });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, severity: newSeverity } : r))
      );
    } catch (err) {
      console.error("Failed to update severity:", err);
    } finally {
      setSeverityUpdating(false);
    }
  };

  // Run ML model classification on-demand for any report with a photo
  const runOnDemandAnalysis = useCallback(async (reportId: string, imageSrc: string) => {
    if (!imageSrc || analyzingReportId === reportId) return;
    if (typeof imageSrc === 'string' && imageSrc.startsWith('data:image/svg')) return;
    setAnalyzingReportId(reportId);
    try {
      let pred: any = null;

      // 1. Try FastAPI ML engine directly (port 8000, pre-warmed EfficientNetV2-S)
      try {
        const c1 = new AbortController();
        const t1 = setTimeout(() => c1.abort(), 12000);

        let fRes: Response | null = null;
        if (typeof imageSrc === 'string' && imageSrc.startsWith('data:image')) {
          const parts = imageSrc.split(';base64,');
          if (parts.length === 2) {
            const mimeType = parts[0].replace('data:', '') || 'image/jpeg';
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            const formData = new FormData();
            formData.append('file', blob, 'road.jpg');

            fRes = await fetch('http://127.0.0.1:8000/predict', {
              method: 'POST',
              body: formData,
              signal: c1.signal,
            });
          }
        }

        if (!fRes) {
          fRes = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageSrc }),
            signal: c1.signal,
          });
        }
        clearTimeout(t1);

        if (fRes && fRes.ok) {
          const body = await fRes.json();
          if (body && (body.prediction || body.rawClass)) pred = body;
        }
      } catch (fErr) {}

      // 2. Try local Next.js API route (bulletproof same-origin)
      if (!pred) {
        try {
          const c2 = new AbortController();
          const t2 = setTimeout(() => c2.abort(), 25000);
          const localRes = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageSrc }),
            signal: c2.signal,
          });
          clearTimeout(t2);
          if (localRes.ok) {
            const body = await localRes.json();
            if (body && body.success && body.data) {
              pred = body.data;
            }
          }
        } catch (localErr) {}
      }

      // 3. Fallback to Express backend classify route
      if (!pred) {
        try {
          const bRes = await fetchFromApi('/reports/classify', {
            method: 'POST',
            body: JSON.stringify({ image: imageSrc }),
          });
          if (bRes && bRes.success) {
            pred = bRes.data;
          }
        } catch (bErr) {}
      }

      if (pred) {
        setReports((prev) =>
          prev.map((r) => {
            if (r.id === reportId) {
              return {
                ...r,
                mlPrediction: pred,
                severity: r.severity || (pred.suggestedSeverity as Severity) || 'medium',
              };
            }
            return r;
          })
        );

        // Persist prediction back to backend report
        fetchFromApi(`/reports/${reportId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            mlPrediction: pred,
            severity: pred.suggestedSeverity || undefined,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('On-demand ML analysis notice:', err);
    } finally {
      setAnalyzingReportId(null);
    }
  }, [analyzingReportId]);

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

  // Auto-analyze selected report if it has an image but no prediction recorded yet
  useEffect(() => {
    if (selected && selected.images && selected.images.length > 0 && !selected.mlPrediction && analyzingReportId !== selected.id) {
      const img = selected.images[0];
      if (typeof img === 'string' && !img.startsWith('data:image/svg') && (img.startsWith('data:image') || img.startsWith('http') || img.startsWith('/'))) {
        runOnDemandAnalysis(selected.id, img);
      }
    }
  }, [selected, analyzingReportId, runOnDemandAnalysis]);

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
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {report.title}
                        {report.images && report.images.length > 0 && (
                          <span title="Has photo" className="inline-flex items-center">
                            <ImageIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted font-mono">{report.id}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      <div>{categoryLabels[report.category as HazardCategory] || report.category}</div>
                      {report.mlPrediction && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                            <Sparkles className="w-2.5 h-2.5" />
                            {report.mlPrediction.label} ({report.mlPrediction.confidencePercentage})
                          </span>
                        </div>
                      )}
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

            {/* Photo & ML Prediction Presentation Card */}
            {(selected.images?.length > 0 || selected.mlPrediction) && (
              <div className="rounded-xl overflow-hidden border border-border bg-black/20 p-3 mb-4 space-y-3">
                {selected.images && selected.images.length > 0 && (
                  <div className="relative aspect-video max-h-56 w-full overflow-hidden rounded-lg border border-border">
                    <img
                      src={selected.images[0]}
                      alt="Hazard evidence photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* ML Prediction Badge and Confidence */}
                {analyzingReportId === selected.id ? (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2.5 text-xs text-blue-300 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    <span>Analyzing hazard photo...</span>
                  </div>
                ) : selected.mlPrediction ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI Road Hazard Prediction
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {selected.mlPrediction.confidencePercentage || `${Math.round((selected.mlPrediction.confidence || 0) * 100)}%`} Confidence
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {selected.mlPrediction.label}
                        </p>
                        <p className="text-[11px] text-muted font-mono mt-0.5">
                          Signature: {selected.mlPrediction.rawClass}
                        </p>
                      </div>
                      {/* Visual Severity Indicator */}
                      {selected.mlPrediction.suggestedSeverity === "high" || selected.mlPrediction.suggestedSeverity === "critical" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> High Priority
                        </span>
                      ) : selected.mlPrediction.suggestedSeverity === "medium" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Moderate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Low / Repaired
                        </span>
                      )}
                    </div>

                    {/* Low Confidence Alert */}
                    {(selected.mlPrediction.low_confidence || selected.mlPrediction.isLowConfidence) && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-300">Low confidence prediction</p>
                          <p className="text-[11px] text-amber-400/80">Please upload a clearer road image for better results or review carefully.</p>
                        </div>
                      </div>
                    )}

                    {/* Top 3 Predictions */}
                    {selected.mlPrediction.topPredictions && selected.mlPrediction.topPredictions.length > 0 && (
                      <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted uppercase">Top Ranked Signatures:</p>
                        <div className="space-y-1">
                          {selected.mlPrediction.topPredictions.slice(0, 3).map((top, idx) => {
                            const confPct = Math.round((top.confidence || 0) * 100);
                            return (
                              <div key={idx} className="bg-black/20 p-1.5 rounded-lg border border-border/50 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-foreground">{top.label || top.rawClass}</span>
                                  <span className="font-bold text-emerald-400">{top.confidencePercentage || `${confPct}%`}</span>
                                </div>
                                <div className="w-full bg-muted/20 rounded-full h-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : "bg-amber-500"}`}
                                    style={{ width: `${confPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-muted">
                      <span className="italic">AI confidence is an automated estimate</span>
                      <button
                        type="button"
                        onClick={() => selected.images?.[0] && runOnDemandAnalysis(selected.id, selected.images[0])}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-classify Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/10 border border-border rounded-lg flex items-center justify-between text-xs text-muted">
                    <span>No automated ML prediction recorded for this report.</span>
                    {selected.images && selected.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => runOnDemandAnalysis(selected.id, selected.images[0])}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" /> Classify Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

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

              {/* Admin Severity Editor (Admin can modify severity, defaults to ML predicted) */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted uppercase">UPDATE SEVERITY (ADMIN OVERRIDE)</p>
                  <span className="text-[11px] text-muted">
                    Active: <strong className="capitalize text-foreground">{selected.severity}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["low", "medium", "high", "critical"] as Severity[]).map((sev) => (
                    <button
                      key={sev}
                      disabled={severityUpdating || selected.severity === sev}
                      onClick={() => handleUpdateSeverity(selected.id, sev)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors capitalize",
                        selected.severity === sev
                          ? "bg-primary text-white border-primary cursor-default"
                          : "bg-input border-border text-foreground hover:bg-card-hover hover:border-primary/50",
                        severityUpdating && "opacity-50 cursor-wait"
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
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
