import {
  CircleAlert,
  Construction,
  Droplets,
  Lightbulb,
  PaintBucket,
  TreePine,
  HelpCircle,
  Car,
  GitCommit,
  Layers,
  Wrench,
  Mountain,
  Trash2,
  Grid,
  Footprints,
} from "lucide-react";
import type { HazardCategory } from "@/types";

const iconMap: Partial<Record<HazardCategory, React.ComponentType<{ className?: string }>>> = {
  pothole: CircleAlert,
  road_cracks: GitCommit,
  damaged_pavement: Construction,
  edge_damage: Layers,
  patch_deterioration: Wrench,
  loose_aggregate: Mountain,
  debris_on_road: Trash2,
  vegetation: TreePine,
  drainage_iron_grid: Grid,
  broken_curb: Footprints,
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
  const Icon = iconMap[category] || HelpCircle;
  return <Icon className={className ?? "w-5 h-5"} />;
}
