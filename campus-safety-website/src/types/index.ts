export type HazardCategory =
  | "pothole"
  | "damaged_pavement"
  | "faded_markings"
  | "roadside_obstruction"
  | "drainage_issue"
  | "poor_lighting"
  | "driver_behavior"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export type Status = "submitted" | "under_review" | "in_progress" | "resolved";

export interface HazardReport {
  id: string;
  title: string;
  description: string;
  category: HazardCategory;
  severity: Severity;
  status: Status;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  reportedBy: string;
  reportedAt: string;
  updatedAt: string;
  priorityScore: number;
}

export const categoryLabels: Record<HazardCategory, string> = {
  pothole: "Pothole",
  damaged_pavement: "Damaged Pavement",
  faded_markings: "Faded Markings",
  roadside_obstruction: "Roadside Obstruction",
  drainage_issue: "Drainage Issue",
  poor_lighting: "Poor Lighting",
  driver_behavior: "Driver Behavior",
  other: "Other",
};

export const categoryColors: Record<HazardCategory, string> = {
  pothole: "#ef4444",
  damaged_pavement: "#f97316",
  faded_markings: "#eab308",
  roadside_obstruction: "#8b5cf6",
  drainage_issue: "#3b82f6",
  poor_lighting: "#6366f1",
  driver_behavior: "#ec4899", // pink color for driver behavior
  other: "#64748b",
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
