export type HazardCategory =
  | "Broken_Staircase"
  | "Debris_on_road"
  | "Edge_Shoulder_Damage"
  | "Iron_grid_damage"
  | "Longitudinal_Crack"
  | "Map(Block)_Cracking"
  | "Patch_Repair"
  | "Paver_Damage"
  | "Pothole_Surface_Breakout"
  | "Raveling_Loose_Aggregate"
  | "Rubble_Unpaved_surface"
  | "Transverse_Crack"
  | "Vegetation_Moss";

export type Severity = "low" | "medium" | "high" | "critical";

export type Status = "submitted" | "under_review" | "in_progress" | "resolved";

export interface MLPredictionItem {
  class: string;
  confidence: number;
  rawClass?: string;
  label?: string;
  confidencePercentage?: string;
  mappedCategory?: HazardCategory | string;
  suggestedSeverity?: Severity | string;
}

export interface MLPrediction {
  filename?: string;
  prediction?: string;
  confidence: number;
  low_confidence?: boolean;
  top_predictions?: Array<{
    class: string;
    confidence: number;
  }>;
  label: string;
  rawClass: string;
  confidencePercentage: string;
  mappedCategory?: HazardCategory | string;
  suggestedSeverity?: Severity | string;
  isLowConfidence?: boolean;
  topPredictions?: Array<{
    class?: string;
    rawClass: string;
    label: string;
    confidence: number;
    confidencePercentage: string;
    mappedCategory?: HazardCategory | string;
    suggestedSeverity?: Severity | string;
  }>;
}

export interface HazardReport {
  id: string;
  title: string;
  description: string;
  category: HazardCategory;
  severity: Severity;
  status: Status;
  location: { lat: number; lng: number; address: string };
  images: string[];
  reportedBy: string;
  reportedAt: string;
  updatedAt: string;
  priorityScore: number;
  mlPrediction?: MLPrediction;
}

export interface DashboardStats {
  totalReports: number;
  pending: number;
  inProgress: number;
  resolved: number;
  criticalCount: number;
  avgResolutionDays: number;
}

export interface TimeSeriesData {
  date: string;
  count: number;
}

export interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

export const categoryLabels: Record<HazardCategory, string> = {
  Broken_Staircase: "Broken Staircase / Curbside",
  Debris_on_road: "Debris on Road",
  Edge_Shoulder_Damage: "Edge & Shoulder Damage",
  Iron_grid_damage: "Iron Grid / Drainage Grate",
  Longitudinal_Crack: "Longitudinal Road Crack",
  "Map(Block)_Cracking": "Map (Block) Cracking",
  Patch_Repair: "Patch Repair Deterioration",
  Paver_Damage: "Paver / Brick Road Damage",
  Pothole_Surface_Breakout: "Pothole & Surface Breakout",
  Raveling_Loose_Aggregate: "Raveling & Loose Aggregate",
  Rubble_Unpaved_surface: "Rubble & Unpaved Surface",
  Transverse_Crack: "Transverse Road Crack",
  Vegetation_Moss: "Vegetation & Moss Overgrowth",
};

export const categoryColors: Record<HazardCategory, string> = {
  Broken_Staircase: "#f43f5e",
  Debris_on_road: "#f59e0b",
  Edge_Shoulder_Damage: "#eab308",
  Iron_grid_damage: "#06b6d4",
  Longitudinal_Crack: "#f97316",
  "Map(Block)_Cracking": "#ea580c",
  Patch_Repair: "#8b5cf6",
  Paver_Damage: "#d946ef",
  Pothole_Surface_Breakout: "#ef4444",
  Raveling_Loose_Aggregate: "#64748b",
  Rubble_Unpaved_surface: "#78716c",
  Transverse_Crack: "#fb923c",
  Vegetation_Moss: "#10b981",
};

export const categoryDefaultSeverity: Record<HazardCategory, Severity> = {
  Pothole_Surface_Breakout: "critical",
  Broken_Staircase: "high",
  Iron_grid_damage: "high",
  "Map(Block)_Cracking": "high",
  Longitudinal_Crack: "medium",
  Transverse_Crack: "medium",
  Paver_Damage: "medium",
  Edge_Shoulder_Damage: "medium",
  Debris_on_road: "medium",
  Rubble_Unpaved_surface: "medium",
  Patch_Repair: "low",
  Raveling_Loose_Aggregate: "low",
  Vegetation_Moss: "low",
};

export const severityLabels: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const statusLabels: Record<Status, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
};
