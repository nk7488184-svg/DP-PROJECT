"use client";

import Link from "next/link";
import { Search, Bell, User, Shield, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";
import NotificationPopover from "./NotificationPopover";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/speed": "Speed Tracker Observatory",
  "/dashboard/enforcement": "Edge Traffic Enforcement",
  "/dashboard/reports": "Hazard Reports",
  "/dashboard/map": "Map View",
  "/dashboard/analytics": "Analytics & Trends",
  "/dashboard/settings": "System Settings",
};

const dashboardMenuItems: StaggeredMenuItem[] = [
  { label: "Overview", ariaLabel: "Dashboard overview", link: "/dashboard" },
  { label: "Speed Tracker", ariaLabel: "Speed Tracker observatory", link: "/dashboard/speed" },
  { label: "Traffic Enforcement", ariaLabel: "Edge radar & camera enforcement", link: "/dashboard/enforcement" },
  { label: "Hazard Reports", ariaLabel: "Citizen hazard reports", link: "/dashboard/reports" },
  { label: "Map View", ariaLabel: "Campus spatial hazard map", link: "/dashboard/map" },
  { label: "Analytics", ariaLabel: "Trends and resolution performance", link: "/dashboard/analytics" },
  { label: "System Settings", ariaLabel: "System settings and calibration", link: "/dashboard/settings" },
  { label: "Public Portal", ariaLabel: "Citizen hazard reporting portal", link: "http://localhost:3000" },
];

const dashboardSocialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "API Docs (/docs)", link: "http://127.0.0.1:8000/docs" },
  { label: "Public Website (:3000)", link: "http://localhost:3000" },
  { label: "GitHub Repository", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = breadcrumbMap[pathname] || "Dashboard";

  const triggerMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border flex items-center justify-between px-3 sm:px-6 bg-card/75 backdrop-blur-md z-30 relative w-full max-w-full overflow-visible">
        {/* Left: Brand Logo & Section Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-all shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xs sm:text-base text-foreground whitespace-nowrap">
              SafeRoads <span className="text-primary font-extrabold">Admin</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border text-sm text-muted">
            <span className="text-zinc-600">/</span>
            <span className="font-semibold text-foreground truncate">{title}</span>
          </div>
        </div>

        {/* Right: Actions & Staggered Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-48 xl:w-56"
            />
          </div>

          {/* Notifications Popover */}
          <NotificationPopover />

          {/* User Profile - hidden on mobile for clean fit */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Admin</span>
          </div>

          {/* Staggered Navigation Trigger Button */}
          <button
            data-menu-trigger
            onClick={triggerMenu}
            className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl cursor-pointer font-bold text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex-shrink-0"
            title="Open Staggered Navigation Menu"
            aria-label="Open Navigation Menu"
            type="button"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-300">MENU</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold hidden sm:inline-block">GSAP</span>
          </button>
        </div>
      </header>

      {/* React Bits StaggeredMenu Overlay - Primary Navigation for Dashboard */}
      <StaggeredMenu
        isFixed={true}
        position="right"
        items={dashboardMenuItems}
        socialItems={dashboardSocialItems}
        displaySocials={true}
        displayItemNumbering={true}
        colors={["#064e3b", "#059669", "#10b981"]}
        accentColor="#10b981"
        logoUrl="/shield-logo.svg"
        menuButtonColor="#ffffff"
        openMenuButtonColor="#10b981"
        changeMenuColorOnOpen={true}
      />
    </>
  );
}