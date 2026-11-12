"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Radio,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarNavItem from "@/components/ui/SidebarNavItem";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/traffic", label: "Radar Telemetry", icon: Radio },
  { href: "/dashboard/speed", label: "Speed Tracker", icon: Gauge },
  { href: "/dashboard/enforcement", label: "Traffic Enforcement", icon: ShieldAlert },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/map", label: "Map View", icon: Map },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const triggerStaggeredMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-full bg-sidebar border-r border-border transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-foreground whitespace-nowrap">
            SafeRoads <span className="text-primary">Admin</span>
          </span>
        )}
      </div>

      {/* Prominent Staggered Menu Action Pill */}
      <div className="px-2 pt-3 pb-2 border-b border-border/60">
        <button
          onClick={triggerStaggeredMenu}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
            "bg-gradient-to-r from-emerald-600/30 via-emerald-500/15 to-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-300 hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:text-white group"
          )}
          title="Open React Bits Staggered Menu"
          type="button"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform flex-shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>Staggered Menu</span>
              <span className="text-[10px] bg-emerald-500/25 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                GSAP
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {collapsed ? (
          navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                title={item.label}
                className={cn(
                  "flex items-center justify-center w-full p-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-muted hover:text-foreground hover:bg-sidebar-hover"
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })
        ) : (
          navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover text-sm transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
