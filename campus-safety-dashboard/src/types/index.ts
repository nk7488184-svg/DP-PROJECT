export type HazardCategory =
  | "pothole"
  | "road_cracks"
  | "damaged_pavement"
  | "edge_damage"
  | "patch_deterioration"
  | "loose_aggregate"
  | "debris_on_road"
  | "vegetation"
  | "drainage_iron_grid"
  | "broken_curb"
  | "faded_markings"
  | "roadside_obstruction"
  | "drainage_issue"
  | "poor_lighting"
  | "driver_behavior"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export type Status = "submitted" | "under_review" | "in_progress" | "resolved";

export interface MLPrediction {
  label: string;
  rawClass: string;
  confidence: number;
  confidencePercentage: string;
  mappedCategory?: string;
  suggestedSeverity?: string;
  isLowConfidence?: boolean;
  topPredictions?: Array<{
    rawClass: string;
    label: string;
    confidence: number;
    confidencePercentage: string;
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
  pothole: "Pothole",
  road_cracks: "Road Cracks",
  damaged_pavement: "Damaged Pavement",
  edge_damage: "Edge & Shoulder Damage",
  patch_deterioration: "Patch Repair",
  loose_aggregate: "Loose Aggregate / Rubble",
  debris_on_road: "Debris on Road",
  vegetation: "Vegetation & Moss",
  drainage_iron_grid: "Drainage / Iron Grid",
  broken_curb: "Broken Curbside / Steps",
  faded_markings: "Faded Markings",
  roadside_obstruction: "Roadside Obstruction",
  drainage_issue: "Drainage Issue",
  poor_lighting: "Poor Lighting",
  driver_behavior: "Driver Behavior",
  other: "Other",
};

export const categoryColors: Record<HazardCategory, string> = {
  pothole: "#ef4444",
  road_cracks: "#f97316",
  damaged_pavement: "#fb923c",
  edge_damage: "#eab308",
  patch_deterioration: "#a855f7",
  loose_aggregate: "#64748b",
  debris_on_road: "#d97706",
  vegetation: "#10b981",
  drainage_iron_grid: "#06b6d4",
  broken_curb: "#f43f5e",
  faded_markings: "#ca8a04",
  roadside_obstruction: "#8b5cf6",
  drainage_issue: "#3b82f6",
  poor_lighting: "#0ea5e9",
  driver_behavior: "#ec4899",
  other: "#6b7280",
};

export const severityLabels: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const severityColors: Record<Severity, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export const statusColors: Record<Status, string> = {
  submitted: "#3b82f6",
  under_review: "#eab308",
  in_progress: "#8b5cf6",
  resolved: "#22c55e",
};

export const statusLabels: Record<Status, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
};
