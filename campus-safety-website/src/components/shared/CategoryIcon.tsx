import {
  CircleAlert,
  Construction,
  TreePine,
  HelpCircle,
  GitCommit,
  Layers,
  Wrench,
  Mountain,
  Trash2,
  Grid,
  Footprints,
} from "lucide-react";
import type { HazardCategory } from "@/types";

const iconMap: Record<HazardCategory, React.ComponentType<{ className?: string }>> = {
  Broken_Staircase: Footprints,
  Debris_on_road: Trash2,
  Edge_Shoulder_Damage: Layers,
  Iron_grid_damage: Grid,
  Longitudinal_Crack: GitCommit,
  "Map(Block)_Cracking": Construction,
  Patch_Repair: Wrench,
  Paver_Damage: Layers,
  Pothole_Surface_Breakout: CircleAlert,
  Raveling_Loose_Aggregate: Mountain,
  Rubble_Unpaved_surface: Mountain,
  Transverse_Crack: GitCommit,
  Vegetation_Moss: TreePine,
};

export default function CategoryIcon({
  category,
  className,
}: {
  category: HazardCategory | string;
  className?: string;
}) {
  const Icon = (category && iconMap[category as HazardCategory]) || HelpCircle;
  return <Icon className={className ?? "w-5 h-5"} />;
}
