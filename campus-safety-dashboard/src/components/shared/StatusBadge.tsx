import { cn } from "@/lib/utils";
import { statusLabels, type Status } from "@/types";

const statusStyles: Record<Status, string> = {
  submitted: "bg-blue-500/20 text-blue-400",
  under_review: "bg-amber-500/20 text-amber-400",
  in_progress: "bg-orange-500/20 text-orange-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", statusStyles[status])}>
      {statusLabels[status]}
    </span>
  );
}
