import { cn } from "@/lib/utils";
import { severityLabels, type Severity } from "@/types";

const severityStyles: Record<Severity, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        severityStyles[severity]
      )}
    >
      {severityLabels[severity]}
    </span>
  );
}
