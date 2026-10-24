"use client";

import { Camera, Brain, CheckCircle } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Camera,
    title: "Report Hazard",
    desc: "Snap a photo, drop a pin on the map, and label its category. Takes under a minute.",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI Classification",
    desc: "The computer vision module labels the image, assesses severity, and ranks priority automatically.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Authorities Act",
    desc: "Campus administrators coordinate repairs, update status, and close the loop via the observatory.",
  },
];

export default function ProcessFlow() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
            Process Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">
            How It Works
          </h2>
        </div>
        <p className="text-gray-500 text-sm max-w-sm mt-2 md:mt-0 leading-relaxed">
          An active loop of student crowdsourcing, automated AI classification,
          and administrative action.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-0 relative">
        {/* Connecting line across all steps (desktop only) */}
        <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-px bg-gradient-to-r from-gray-200 via-emerald-200 to-gray-200 z-0" />

        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="relative group px-6">
              {/* Step number + icon row */}
              <div className="flex items-center gap-4 mb-6 z-10 relative">
                <span className="text-6xl font-black text-gray-100 group-hover:text-emerald-50 tracking-tighter transition-colors duration-500 select-none">
                  {item.step}
                </span>
                <div className="w-12 h-12 border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-400 group-hover:border-emerald-500 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all duration-500 relative z-10">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {/* Text content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                {item.desc}
              </p>

              {/* Mobile connecting line */}
              {idx < steps.length - 1 && (
                <div className="md:hidden w-px h-8 bg-gray-200 ml-[52px] my-4" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
