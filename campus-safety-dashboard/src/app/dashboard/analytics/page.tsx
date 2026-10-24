import MonthlyBarChart from "@/components/dashboard/MonthlyBarChart";
import ResolutionChart from "@/components/dashboard/ResolutionChart";
import HazardZonesTable from "@/components/dashboard/HazardZonesTable";
import CategoryPieChart from "@/components/dashboard/CategoryPieChart";
import StatusFunnelChart from "@/components/dashboard/StatusFunnelChart";
import CategoryRadarChart from "@/components/dashboard/CategoryRadarChart";
import SLAComplianceRingChart from "@/components/dashboard/SLAComplianceRingChart";
import { Calendar } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Analytics & Trends</h2>
          <p className="text-sm text-muted">Deep dive into campus road safety data.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-muted" />
          <select className="bg-transparent text-sm text-foreground focus:outline-none border-none">
            <option value="90">Last 90 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MonthlyBarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResolutionChart />
        <StatusFunnelChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <HazardZonesTable />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <CategoryRadarChart />
        <SLAComplianceRingChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CategoryPieChart />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
            <h4 className="text-sm text-muted mb-1">Most Common Hazard</h4>
            <p className="text-2xl font-bold text-foreground">Potholes</p>
            <p className="text-xs text-emerald-400 mt-2">Accounts for 35% of all reports</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
            <h4 className="text-sm text-muted mb-1">Peak Reporting Time</h4>
            <p className="text-2xl font-bold text-foreground">Mon & Tue</p>
            <p className="text-xs text-muted mt-2">Highest volume between 9 AM - 12 PM</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
            <h4 className="text-sm text-muted mb-1">Avg Critical Resolution</h4>
            <p className="text-2xl font-bold text-foreground">24 Hours</p>
            <p className="text-xs text-emerald-400 mt-2">12% faster than last month</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
            <h4 className="text-sm text-muted mb-1">User Engagement</h4>
            <p className="text-2xl font-bold text-foreground">+15%</p>
            <p className="text-xs text-emerald-400 mt-2">Increase in reports from new users</p>
          </div>
        </div>
      </div>
    </div>
  );
}
