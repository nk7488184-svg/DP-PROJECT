import {
  CircleAlert,
  Construction,
  Droplets,
  Lightbulb,
  PaintBucket,
  TreePine,
  HelpCircle,
  Car,
} from "lucide-react";
import type { HazardCategory } from "@/types";

const iconMap: Record<HazardCategory, React.ComponentType<{ className?: string }>> = {
  pothole: CircleAlert,
  damaged_pavement: Construction,
  faded_markings: PaintBucket,
  roadside_obstruction: TreePine,
  drainage_issue: Droplets,
  poor_lighting: Lightbulb,
  driver_behavior: Car,
  other: HelpCircle,
};

export default function CategoryIcon({
  category,
  className,
}: {
  category: HazardCategory;
  className?: string;
}) {
  const Icon = iconMap[category];
  return <Icon className={className ?? "w-5 h-5"} />;
}
