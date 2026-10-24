import { cn } from "@/lib/utils";
import { severityLabels, type Severity } from "@/types";

const severityStyles: Record<Severity, string> = {
  low: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", severityStyles[severity])}>
      {severityLabels[severity]}
    </span>
  );
}
