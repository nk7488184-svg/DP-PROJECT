import { cn } from "@/lib/utils";
import { statusLabels, type Status } from "@/types";

const statusStyles: Record<Status, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  in_progress: "bg-orange-100 text-orange-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
