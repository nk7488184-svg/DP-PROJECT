import { HazardReport, DashboardStats, HazardCategory } from "@/types";

const campusLocations = [
  { lat: 31.7754, lng: 76.9861, address: "Main Academic Block Road" },
  { lat: 31.7748, lng: 76.9855, address: "Near North Campus Gate" },
  { lat: 31.7761, lng: 76.9870, address: "Hostel Road - Block A" },
  { lat: 31.7740, lng: 76.9848, address: "Library Junction" },
  { lat: 31.7769, lng: 76.9878, address: "Sports Complex Road" },
  { lat: 31.7735, lng: 76.9842, address: "South Campus Entrance" },
  { lat: 31.7757, lng: 76.9865, address: "Cafeteria Parking Lot" },
  { lat: 31.7745, lng: 76.9852, address: "Workshop Road" },
  { lat: 31.7763, lng: 76.9873, address: "Hostel Block C Entrance" },
  { lat: 31.7750, lng: 76.9858, address: "Central Lawn Pathway" },
  { lat: 31.7738, lng: 76.9845, address: "Admin Building Curve" },
  { lat: 31.7772, lng: 76.9882, address: "Faculty Quarters Road" },
  { lat: 31.7743, lng: 76.9850, address: "Auditorium Lane" },
  { lat: 31.7766, lng: 76.9876, address: "Medical Center Road" },
  { lat: 31.7752, lng: 76.9863, address: "SBI ATM Road" },
  { lat: 31.7759, lng: 76.9868, address: "OAT Approach Road" },
  { lat: 31.7747, lng: 76.9854, address: "Lab Complex Junction" },
  { lat: 31.7770, lng: 76.9880, address: "Kamand Bridge Road" },
  { lat: 31.7736, lng: 76.9843, address: "Guest House Path" },
  { lat: 31.7755, lng: 76.9862, address: "Mess Road" },
  { lat: 31.7742, lng: 76.9849, address: "Parking Area B" },
  { lat: 31.7768, lng: 76.9879, address: "Tennis Court Road" },
  { lat: 31.7733, lng: 76.9840, address: "Main Gate Approach" },
  { lat: 31.7760, lng: 76.9869, address: "Hostel Block D Road" },
  { lat: 31.7746, lng: 76.9853, address: "Computer Center Path" },
  { lat: 31.7758, lng: 76.9867, address: "Research Lab Road" },
  { lat: 31.7741, lng: 76.9847, address: "Playground Access Road" },
  { lat: 31.7774, lng: 76.9884, address: "Upper Campus Road" },
  { lat: 31.7737, lng: 76.9844, address: "Lower Campus Curve" },
  { lat: 31.7764, lng: 76.9874, address: "New Hostel Road" },
];

const categories: HazardCategory[] = [
  "pothole", "damaged_pavement", "faded_markings",
  "roadside_obstruction", "drainage_issue", "poor_lighting", "driver_behavior", "other",
];

const severities = ["low", "medium", "high", "critical"] as const;
const statuses = ["submitted", "under_review", "in_progress", "resolved"] as const;

const titles: Record<HazardCategory, string[]> = {
  pothole: ["Large pothole on road", "Deep pothole near drain", "Multiple potholes cluster", "Expanding pothole"],
  damaged_pavement: ["Cracked pavement section", "Broken sidewalk tiles", "Pavement sinking", "Eroded shoulder"],
  faded_markings: ["Faded speed breaker markings", "Invisible crosswalk", "Missing lane markings", "Worn stop line"],
  roadside_obstruction: ["Fallen tree branch", "Construction debris", "Abandoned vehicle", "Overgrown bushes"],
  drainage_issue: ["Blocked drain overflowing", "Water logging area", "Open manhole cover", "Damaged culvert"],
  poor_lighting: ["Street light not working", "Dark stretch near hostel", "Flickering lamp post", "Missing light fixture"],
  driver_behavior: ["Over speeding vehicle", "Reckless driving near intersection", "Wrong-way driving", "Ignoring stop sign"],
  other: ["Loose gravel on road", "Missing signage", "Damaged railing", "Uneven road surface"],
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomDate(daysBack: number, seed: number): string {
  const d = new Date("2026-08-20T12:00:00Z");
  d.setDate(d.getDate() - Math.floor(seededRandom(seed) * daysBack));
  d.setHours(Math.floor(seededRandom(seed + 1) * 24), Math.floor(seededRandom(seed + 2) * 60));
  return d.toISOString();
}

function generateReports(): HazardReport[] {
  const generated = campusLocations.map((loc, i) => {
    const cat = categories[i % categories.length];
    const sev = severities[Math.floor(seededRandom(i) * severities.length)];
    const stat = statuses[Math.floor(seededRandom(i + 100) * statuses.length)];
    const titleOptions = titles[cat];
    const reportedAt = randomDate(90, i);
    const updatedAt = randomDate(30, i + 200);

    return {
      id: `RPT-${String(1001 + i).padStart(4, "0")}`,
      title: titleOptions[Math.floor(seededRandom(i + 50) * titleOptions.length)],
      description: `Detailed description for report at ${loc.address}. This needs attention.`,
      category: cat,
      severity: sev,
      status: stat,
      location: loc,
      images: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400",
      ],
      reportedBy: `user${100 + i}@iitmandi.ac.in`,
      reportedAt,
      updatedAt: updatedAt > reportedAt ? updatedAt : reportedAt,
      priorityScore: sev === "critical" ? 95 + seededRandom(i) * 5 :
        sev === "high" ? 70 + seededRandom(i) * 20 :
        sev === "medium" ? 40 + seededRandom(i) * 25 :
        10 + seededRandom(i) * 25,
    };
  });
  
  // Hardcode a driver behavior hotspot cluster for demo
  const hotspotLoc = campusLocations[0];
  generated.unshift({
    id: "RPT-0999",
    title: "Reckless driving near intersection",
    description: "Car was speeding above 60km/h near the pedestrian crossing.",
    category: "driver_behavior",
    severity: "critical",
    status: "submitted",
    location: hotspotLoc,
    images: [],
    reportedBy: "guard1@iitmandi.ac.in",
    reportedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priorityScore: 98,
  });
  generated.unshift({
    id: "RPT-0998",
    title: "Over speeding vehicle",
    description: "Another speeding incident by a white sedan.",
    category: "driver_behavior",
    severity: "high",
    status: "under_review",
    location: hotspotLoc,
    images: [],
    reportedBy: "student_cam@iitmandi.ac.in",
    reportedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    priorityScore: 85,
  });
  
  return generated;
}

export const mockReports: HazardReport[] = generateReports();

export const dashboardStats: DashboardStats = {
  totalReports: mockReports.length,
  pending: mockReports.filter((r) => r.status === "submitted" || r.status === "under_review").length,
  inProgress: mockReports.filter((r) => r.status === "in_progress").length,
  resolved: mockReports.filter((r) => r.status === "resolved").length,
  criticalCount: mockReports.filter((r) => r.severity === "critical").length,
  avgResolutionDays: 4.2,
};

export const timeSeriesData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date("2026-08-20T12:00:00Z");
  d.setDate(d.getDate() - (29 - i));
  return { date: d.toISOString().split("T")[0], count: Math.floor(seededRandom(i) * 5) + 1 };
});

export const categoryDistribution = categories.map((cat) => {
  const count = mockReports.filter((r) => r.category === cat).length;
  return { category: cat, count, percentage: Math.round((count / mockReports.length) * 100) };
});

export const monthlyTrends = [
  { month: "Mar", submitted: 12, resolved: 8 },
  { month: "Apr", submitted: 18, resolved: 14 },
  { month: "May", submitted: 15, resolved: 12 },
  { month: "Jun", submitted: 22, resolved: 16 },
  { month: "Jul", submitted: 19, resolved: 18 },
  { month: "Aug", submitted: 25, resolved: 20 },
];

export const resolutionTimeData = [
  { week: "W1", days: 5.2 },
  { week: "W2", days: 4.8 },
  { week: "W3", days: 6.1 },
  { week: "W4", days: 3.9 },
  { week: "W5", days: 4.3 },
  { week: "W6", days: 3.5 },
  { week: "W7", days: 4.0 },
  { week: "W8", days: 3.2 },
];

export const topHazardZones = [
  { zone: "Hostel Road - Block A", count: 8, topCategory: "pothole", avgSeverity: "high" as const },
  { zone: "Main Academic Block Road", count: 6, topCategory: "damaged_pavement", avgSeverity: "medium" as const },
  { zone: "Library Junction", count: 5, topCategory: "drainage_issue", avgSeverity: "high" as const },
  { zone: "South Campus Entrance", count: 4, topCategory: "poor_lighting", avgSeverity: "medium" as const },
  { zone: "Kamand Bridge Road", count: 4, topCategory: "faded_markings", avgSeverity: "critical" as const },
];
