import { topHazardZones } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory } from "@/types";
import SeverityBadge from "@/components/shared/SeverityBadge";
import type { Severity } from "@/types";

export default function HazardZonesTable() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Hazard Zones</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-xs font-semibold text-muted uppercase">Zone</th>
              <th className="pb-2 text-xs font-semibold text-muted uppercase">Reports</th>
              <th className="pb-2 text-xs font-semibold text-muted uppercase">Top Category</th>
              <th className="pb-2 text-xs font-semibold text-muted uppercase">Avg Severity</th>
            </tr>
          </thead>
          <tbody>
            {topHazardZones.map((zone) => (
              <tr key={zone.zone} className="border-b border-border/30">
                <td className="py-2.5 text-foreground font-medium">{zone.zone}</td>
                <td className="py-2.5 text-foreground">{zone.count}</td>
                <td className="py-2.5 text-muted">{categoryLabels[zone.topCategory as HazardCategory]}</td>
                <td className="py-2.5"><SeverityBadge severity={zone.avgSeverity as Severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
