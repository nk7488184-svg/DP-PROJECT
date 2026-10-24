import ReportsTable from "@/components/dashboard/ReportsTable";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Hazard Reports</h2>
          <p className="text-sm text-muted">Manage, filter, and review all reported safety hazards.</p>
        </div>
      </div>
      <ReportsTable />
    </div>
  );
}
