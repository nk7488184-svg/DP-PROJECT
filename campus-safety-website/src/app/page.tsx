import Link from "next/link";
import {
  Shield,
  Camera,
  MapPin,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Radar from "@/components/ui/Radar";
import CountUpStatsBar from "@/components/ui/CountUpStatsBar";
import ProcessFlow from "@/components/ui/ProcessFlow";
import TrendChart from "@/components/ui/TrendChart";
import FlowingMenu from "@/components/ui/FlowingMenu";
import RecentReportRows from "@/components/ui/RecentReportRows";
import { mockStats } from "@/lib/mock-data";

const menuItems = [
  { link: '/report', text: 'Report Hazard', image: 'https://images.unsplash.com/photo-1584347781878-3a2185b3bc91?q=80&w=600&h=400&fit=crop' },
  { link: '/map', text: 'Live Map', image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&h=400&fit=crop' },
  { link: '/track', text: 'Track Status', image: 'https://images.unsplash.com/photo-1541888046897-f58c73c880ec?q=80&w=600&h=400&fit=crop' },
  { link: '#', text: 'Guidelines', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&h=400&fit=crop' }
];

const statsItems = [
  { value: mockStats.totalReports, suffix: "+", label: "Hazards Logged" },
  { value: mockStats.resolved, suffix: "", label: "Issues Resolved" },
  { value: mockStats.pending + mockStats.inProgress, suffix: "", label: "Active Hazards" },
  { value: mockStats.criticalCount, suffix: "", label: "Critical Alerts" },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero Section — deep dark bg with animated Radar canvas */}
        <section className="relative bg-[#07130d] text-white overflow-hidden py-28 sm:py-36 flex items-center min-h-[520px]">
          <Radar
            speed={1}
            scale={0.7}
            ringCount={8}
            spokeCount={12}
            ringThickness={0.03}
            spokeThickness={0.01}
            sweepSpeed={1}
            sweepWidth={2}
            sweepLobes={1}
            color="#10b981"
            backgroundColor="#07130d"
            falloff={1.5}
            brightness={0.8}
            enableMouseInteraction
            mouseInfluence={0.1}
            className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07130d] via-[#07130d]/80 to-transparent z-[1]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-emerald-950/80 border border-emerald-800/60 rounded-full text-xs font-semibold text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Campus Road Safety Observatory</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6 text-white">
                Making IIT Mandi
                <br />
                Roads <span className="text-emerald-400">Safer</span>
              </h1>
              <p className="text-base sm:text-lg text-emerald-100/75 mb-8 max-w-xl font-light leading-relaxed">
                Report road hazards, track their resolution, and help build a
                safer campus environment for all. Powered by community-driven
                reports and computer vision analysis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/report"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-[#07130d] rounded-xl font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                >
                  <Camera className="w-5 h-5" />
                  Report a Hazard
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-emerald-800/80 text-emerald-400 rounded-xl font-semibold hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  View Map
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CountUp Stats Bar — animated on scroll */}
        <CountUpStatsBar items={statsItems} />

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Data-Driven Safety
              </h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                We track hazard resolution speeds to ensure accountability and faster response times for our community.
              </p>
            </div>
            <TrendChart />
          </div>
        </section>

        {/* Process Flow — How It Works */}
        <ProcessFlow />

        {/* Recent Reports — Interactive expandable rows */}
        <section className="bg-gray-50 py-24 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Feed
                </span>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                  Recent Reports
                </h2>
              </div>
              <Link
                href="/map"
                className="hidden sm:flex items-center gap-1.5 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
              >
                <span>View all on map</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <RecentReportRows />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-8 sm:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_60%)]" />
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-emerald-400 relative z-10" />
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 relative z-10">
              See something unsafe?
            </h2>
            <p className="text-emerald-200/80 mb-8 max-w-md mx-auto font-light text-sm sm:text-base relative z-10">
              Your crowdsourced reports alert authorities to prevent accidents
              and keep Mandi&apos;s mountain roads safe.
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-[#07130d] rounded-xl font-bold hover:bg-emerald-400 transition-colors relative z-10"
            >
              Report it now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
        
        {/* Full-width Flowing Menu */}
        <section className="w-full h-[600px] border-y border-white/10 bg-[#07130d]">
          <FlowingMenu 
            items={menuItems} 
            bgColor="#07130d" 
            textColor="#e2e8f0"
            borderColor="rgba(255,255,255,0.1)"
            marqueeBgColor="#10b981"
            marqueeTextColor="#07130d"
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
