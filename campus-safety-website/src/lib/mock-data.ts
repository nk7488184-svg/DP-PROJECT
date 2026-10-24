import { HazardReport, HazardCategory } from "@/types";

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
];

const categories: HazardCategory[] = [
  "pothole", "damaged_pavement", "faded_markings",
  "roadside_obstruction", "drainage_issue", "poor_lighting", "driver_behavior", "other",
];

const severities = ["low", "medium", "high", "critical"] as const;
const statuses = ["submitted", "under_review", "in_progress", "resolved"] as const;

const titles: Record<HazardCategory, string[]> = {
  pothole: ["Large pothole on road", "Deep pothole near drain", "Multiple potholes cluster"],
  damaged_pavement: ["Cracked pavement section", "Broken sidewalk tiles", "Pavement sinking"],
  faded_markings: ["Faded speed breaker markings", "Invisible crosswalk", "Missing lane markings"],
  roadside_obstruction: ["Fallen tree branch", "Construction debris", "Abandoned vehicle"],
  drainage_issue: ["Blocked drain overflowing", "Water logging area", "Open manhole cover"],
  poor_lighting: ["Street light not working", "Dark stretch near hostel", "Flickering lamp post"],
  driver_behavior: ["Over speeding vehicle", "Reckless driving near intersection", "Wrong-way driving", "Ignoring stop sign"],
  other: ["Loose gravel on road", "Missing signage", "Damaged railing"],
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomDate(daysBack: number, seed: number): string {
  const d = new Date("2026-08-20T12:00:00Z"); // fixed base date
  d.setDate(d.getDate() - Math.floor(seededRandom(seed) * daysBack));
  d.setHours(Math.floor(seededRandom(seed + 1) * 24), Math.floor(seededRandom(seed + 2) * 60));
  return d.toISOString();
}

function generateReports(): HazardReport[] {
  return campusLocations.map((loc, i) => {
    const cat = categories[i % categories.length];
    const sev = severities[Math.floor(seededRandom(i) * severities.length)];
    const stat = statuses[Math.floor(seededRandom(i + 100) * statuses.length)];
    const titleOptions = titles[cat];
    const reportedAt = randomDate(90, i);
    const updatedAt = randomDate(30, i + 200);

    return {
      id: `RPT-${String(1001 + i).padStart(4, "0")}`,
      title: titleOptions[i % titleOptions.length],
      description: `Reported hazard at ${loc.address}. This ${cat.replace(/_/g, " ")} poses a ${sev} risk to pedestrians and vehicles. Immediate attention is needed.`,
      category: cat,
      severity: sev,
      status: stat,
      location: loc,
      images: [`/images/hazard-${(i % 6) + 1}.jpg`],
      reportedBy: `user${100 + i}@iitmandi.ac.in`,
      reportedAt,
      updatedAt: updatedAt > reportedAt ? updatedAt : reportedAt,
      priorityScore: sev === "critical" ? 95 + seededRandom(i) * 5 :
        sev === "high" ? 70 + seededRandom(i) * 20 :
        sev === "medium" ? 40 + seededRandom(i) * 25 :
        10 + seededRandom(i) * 25,
    };
  });
}

export const mockReports: HazardReport[] = generateReports();

export const mockStats = {
  totalReports: mockReports.length,
  pending: mockReports.filter((r) => r.status === "submitted" || r.status === "under_review").length,
  inProgress: mockReports.filter((r) => r.status === "in_progress").length,
  resolved: mockReports.filter((r) => r.status === "resolved").length,
  criticalCount: mockReports.filter((r) => r.severity === "critical").length,
};

export const categoryDistribution = categories.map((cat) => ({
  category: cat,
  count: mockReports.filter((r) => r.category === cat).length,
}));
