import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">SafeRoads IIT Mandi</span>
            </div>
            <p className="text-sm leading-relaxed">
              Campus Road Safety Observatory — an AI-based platform for hazard
              reporting and safety analytics.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/report" className="hover:text-white transition-colors">Report Hazard</a></li>
              <li><a href="/track" className="hover:text-white transition-colors">Track Report</a></li>
              <li><a href="/map" className="hover:text-white transition-colors">View Map</a></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-semibold text-white mb-3">About</h4>
            <p className="text-sm leading-relaxed">
              Design Practicum Project (IC202P)
              <br />
              School of Civil and Environmental Engineering
              <br />
              IIT Mandi, Himachal Pradesh
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} Campus Road Safety Observatory — IIT Mandi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
