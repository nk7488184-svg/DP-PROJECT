"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, User, Clock, AlertTriangle, ChevronRight, X, ExternalLink } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { fetchFromApi } from "@/lib/api";
import { categoryLabels, categoryColors, severityLabels, type HazardCategory, type HazardReport } from "@/types";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/reports": "Reports",
  "/dashboard/map": "Map View",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

// Helper for human-readable relative time (e.g., "2m ago", "1h ago")
function getRelativeTime(timestamp: string | number): string {
  if (!timestamp) return "Just now";
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = breadcrumbMap[pathname] || "Dashboard";

  const [reports, setReports] = useState<HazardReport[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load real-time reports for notifications
  const loadReports = () => {
    fetchFromApi('/reports?limit=15')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setReports(res.data);
          // Count recent pending/submitted reports
          const unread = res.data.filter((r: any) => r.status === 'submitted').length;
          setUnreadCount(unread);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 6000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm relative z-30">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted">Dashboard</p>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search reports..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                router.push("/dashboard/reports");
              }
            }}
            className="pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-60"
          />
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-card-hover transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-muted hover:text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl py-3 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">Incident Alerts</h3>
                  {unreadCount > 0 && (
                    <span className="text-[11px] bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-muted hover:text-foreground rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
                {reports.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    No new reports logged yet.
                  </div>
                ) : (
                  reports.slice(0, 8).map((rep) => {
                    const timeAgo = getRelativeTime(rep.reportedAt);
                    const color = categoryColors[rep.category as HazardCategory] || "#ef4444";

                    return (
                      <div
                        key={rep.id || (rep as any)._id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push("/dashboard/reports");
                        }}
                        className="p-3.5 hover:bg-card-hover/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs font-bold font-mono text-primary truncate">
                              {rep.id}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-muted/20 text-foreground font-medium uppercase">
                              {categoryLabels[rep.category as HazardCategory] || rep.category}
                            </span>
                          </div>
                          
                          {/* Relative Time Badge */}
                          <span className="text-[11px] text-muted flex items-center gap-1 flex-shrink-0 font-medium">
                            <Clock className="w-3 h-3 opacity-60" />
                            {timeAgo}
                          </span>
                        </div>

                        {/* Title and location brief */}
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {rep.title}
                        </p>
                        
                        <div className="flex items-center justify-between text-[11px] text-muted mt-1">
                          <span className="truncate max-w-[200px]">
                            📍 {rep.location?.address || "IIT Mandi Campus"}
                          </span>
                          <span className={`capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                            rep.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            rep.severity === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {rep.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* View all footer link */}
              <div className="pt-2 px-4 border-t border-border mt-1">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    router.push("/dashboard/reports");
                  }}
                  className="w-full text-center text-xs text-primary hover:underline font-medium flex items-center justify-center gap-1 py-1"
                >
                  <span>View all incident reports</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Admin</span>
        </div>
      </div>
    </header>
  );
}
