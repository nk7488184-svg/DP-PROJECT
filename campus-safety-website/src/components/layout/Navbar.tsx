"use client";

import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";

const menuItems: StaggeredMenuItem[] = [
  { label: "Home", ariaLabel: "Go to home page", link: "/" },
  { label: "Report Hazard", ariaLabel: "Report a road safety hazard", link: "/report" },
  { label: "Track Report", ariaLabel: "Track your report resolution status", link: "/track" },
  { label: "Live Map", ariaLabel: "View campus hazard heatmap and pins", link: "/map" },
];

const socialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "Campus Security", link: "tel:01905267000" },
  { label: "Emergency: 112", link: "tel:112" },
  { label: "GitHub", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function Navbar() {
  const triggerMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full max-w-full overflow-hidden bg-white/95 dark:bg-[#07130d]/95 backdrop-blur-md border-b border-border/80 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-xl flex items-center justify-center group-hover:bg-primary-dark transition-all shadow-sm flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="font-bold text-xs sm:text-base text-foreground tracking-tight whitespace-nowrap truncate">
                SafeRoads <span className="text-primary font-extrabold">IIT Mandi</span>
              </span>
            </Link>

            {/* Menu Trigger Button */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link
                href="/report"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-all shadow-sm"
              >
                Report Hazard
              </Link>
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
          </div>
        </div>
      </nav>

      {/* React Bits StaggeredMenu is the Primary Navigation */}
      <StaggeredMenu
        isFixed={true}
        position="right"
        items={menuItems}
        socialItems={socialItems}
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