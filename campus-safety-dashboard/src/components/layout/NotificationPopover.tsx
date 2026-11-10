"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  ShieldAlert, 
  MapPin, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Trash2,
  RefreshCw
} from "lucide-react";
import { fetchFromApi } from "@/lib/api";
import { getAllMergedReports } from "@/lib/localReportsStore";
import type { HazardReport, Severity } from "@/types";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: Severity;
  address: string;
  timestamp: string;
  isRead: boolean;
  type: "hazard" | "speed_radar" | "system";
  linkUrl: string;
}

const READ_STORAGE_KEY = "campus_safety_admin_read_notifications";

function getStoredReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

export default function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize read IDs
  useEffect(() => {
    setReadIds(getStoredReadIds());
  }, []);

  // Fetch reports for notifications
  const loadNotifications = () => {
    fetchFromApi("/reports?limit=15")
      .then((res) => {
        let backendItems: HazardReport[] = [];
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          backendItems = res.data.map((r: any) => ({
            id: r.id || r._id || `RPT-${Math.floor(Math.random() * 9000)}`,
            title: r.title || "Hazard Report",
            description: r.description || "",
            category: r.category || "other",
            severity: r.severity || "medium",
            status: r.status || "submitted",
            location: r.location || { lat: 31.7754, lng: 76.9861, address: "IIT Mandi Campus" },
            images: r.images || [],
            reportedBy: typeof r.reportedBy === "object" ? r.reportedBy?.name || "Campus Reporter" : r.reportedBy || "Campus Reporter",
            reportedAt: r.reportedAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
            priorityScore: r.priorityScore || 50,
          }));
        }
        setReports(getAllMergedReports(backendItems));
      })
      .catch(() => {
        setReports(getAllMergedReports([]));
      });
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 6000);
    const onFocus = () => loadNotifications();
    const onCustomUpdate = () => loadNotifications();

    window.addEventListener("focus", onFocus);
    window.addEventListener("campus-reports-updated", onCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("campus-reports-updated", onCustomUpdate);
    };
  }, []);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Transform reports into structured notifications
  const notifications: NotificationItem[] = useMemo(() => {
    return reports.slice(0, 12).map((r) => {
      const isRead = readIds.includes(r.id);
      return {
        id: r.id,
        title: r.title || "Road Hazard Report",
        description: r.description || `Reported in ${r.location?.address || "IIT Mandi Campus"}`,
        category: r.category,
        severity: r.severity,
        address: r.location?.address || "Campus Road",
        timestamp: r.reportedAt,
        isRead,
        type: "hazard",
        linkUrl: `/dashboard/reports`,
      };
    });
  }, [reports, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    saveStoredReadIds(updated);
  };

  const markOneAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      saveStoredReadIds(updated);
    }
  };

  const getSeverityBadgeClass = (severity: Severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="View Notifications & Hazard Alerts"
        className={cn(
          "relative p-2 rounded-xl transition-all border outline-none cursor-pointer flex items-center justify-center",
          isOpen
            ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            : "border-transparent text-muted hover:text-foreground hover:bg-card-hover"
        )}
      >
        <Bell className={cn("w-5 h-5 transition-transform duration-200", isOpen && "rotate-12")} />
        
        {/* Unread Indicator Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-background shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-card/95 backdrop-blur-xl border border-border/80 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right flex flex-col"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          {/* Popover Header */}
          <div className="p-4 border-b border-border/70 flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted">Real-time road hazard & telemetry alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={loadNotifications}
                title="Refresh alerts"
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-zinc-950/20 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer text-xs",
                filter === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer text-xs",
                filter === "unread"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scrollable List */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-border/40 divide-solid">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                <p className="text-xs text-muted mt-1 max-w-[240px]">
                  {filter === "unread"
                    ? "You have no unread notifications at the moment."
                    : "No hazard alerts or telemetry notices recorded yet."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.linkUrl}
                  onClick={() => {
                    markOneAsRead(notif.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "block p-3.5 hover:bg-card-hover/40 transition-all text-left relative group",
                    !notif.isRead && "bg-primary/[0.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity / Status Dot */}
                    <div className="mt-1 flex-shrink-0">
                      {!notif.isRead ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="font-mono text-[10px] font-bold text-primary flex-shrink-0">
                            {notif.id}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0",
                            getSeverityBadgeClass(notif.severity)
                          )}>
                            {notif.severity}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      <h4 className={cn(
                        "text-xs truncate font-medium",
                        !notif.isRead ? "text-foreground font-semibold" : "text-foreground/80"
                      )}>
                        {notif.title}
                      </h4>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1 truncate">
                        <MapPin className="w-3 h-3 text-muted flex-shrink-0" />
                        <span className="truncate">{notif.address}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-3" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-3 border-t border-border/60 bg-card/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted">
              Auto-syncing with backend
            </span>
            <Link
              href="/dashboard/reports"
              onClick={() => setIsOpen(false)}
              className="text-primary hover:text-primary-dark font-semibold text-xs flex items-center gap-1 hover:underline"
            >
              <span>View all reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
