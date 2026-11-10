import type { HazardReport, HazardCategory, Severity, Status } from "@/types";

// Seeded random data generator for IIT Mandi campus
const locations = [
  { lat: 31.7754, lng: 76.9861, address: "Main Academic Building Road" },
  { lat: 31.7782, lng: 76.9895, address: "North Campus Entry Gate" },
  { lat: 31.7721, lng: 76.9832, address: "South Campus Bridge Approach" },
  { lat: 31.7768, lng: 76.9876, address: "Hostel Block C Pathway" },
  { lat: 31.7745, lng: 76.9852, address: "Central Library Road" },
  { lat: 31.7791, lng: 76.9908, address: "Faculty Housing Outer Ring" },
  { lat: 31.7734, lng: 76.9841, address: "Sports Complex Access Road" },
  { lat: 31.7761, lng: 76.9869, address: "Dining Hall 2 Junction" },
  { lat: 31.7778, lng: 76.9888, address: "Engineering Block Internal Road" },
  { lat: 31.7715, lng: 76.9825, address: "River View Point Road" },
  { lat: 31.7787, lng: 76.9901, address: "Guest House Approach" },
  { lat: 31.775, lng: 76.9858, address: "Student Activity Center Lane" },
  { lat: 31.773, lng: 76.9837, address: "Workshop Area Road" },
  { lat: 31.7771, lng: 76.9881, address: "Auditorium Back Road" },
  { lat: 31.7758, lng: 76.9865, address: "Health Center Junction" },
  { lat: 31.7741, lng: 76.9847, address: "Playground Access Road" },
  { lat: 31.7774, lng: 76.9884, address: "Upper Campus Road" },
  { lat: 31.7737, lng: 76.9844, address: "Lower Campus Curve" },
  { lat: 31.7764, lng: 76.9874, address: "New Hostel Road" },
];

const categories: HazardCategory[] = [
  "Pothole_Surface_Breakout",
  "Longitudinal_Crack",
  "Transverse_Crack",
  "Map(Block)_Cracking",
  "Edge_Shoulder_Damage",
  "Patch_Repair",
  "Paver_Damage",
  "Raveling_Loose_Aggregate",
  "Rubble_Unpaved_surface",
  "Broken_Staircase",
  "Debris_on_road",
  "Vegetation_Moss",
  "Iron_grid_damage",
];

const severities = ["low", "medium", "high", "critical"] as const;
const statuses = ["submitted", "under_review", "in_progress", "resolved"] as const;

const titles: Record<HazardCategory, string[]> = {
  Pothole_Surface_Breakout: ["Deep pothole on road", "Surface breakout near turn", "Expanding pothole crater"],
  Longitudinal_Crack: ["Longitudinal road fissure", "Centerline asphalt crack", "Longitudinal fatigue crack"],
  Transverse_Crack: ["Transverse road fracture", "Perpendicular surface crack", "Transverse thermal crack"],
  "Map(Block)_Cracking": ["Alligator / Block cracking", "Interconnected network cracking", "Map cracking on road section"],
  Edge_Shoulder_Damage: ["Shoulder road breakdown", "Eroded asphalt edge", "Curb slope degradation"],
  Patch_Repair: ["Failing asphalt patch", "Deteriorated road repair", "Sunken patch trench"],
  Paver_Damage: ["Broken sidewalk pavers", "Loose paver blocks", "Displaced interlocking bricks"],
  Raveling_Loose_Aggregate: ["Loose aggregate on asphalt", "Dislodged gravel layer", "Surface raveling wear"],
  Rubble_Unpaved_surface: ["Unpaved stony stretch", "Scattered rubble on road", "Rough unpaved pathway"],
  Broken_Staircase: ["Cracked concrete staircase", "Broken pedestrian steps", "Chipped roadside curb"],
  Debris_on_road: ["Fallen tree branch", "Construction debris on road", "Spilled construction stones"],
  Vegetation_Moss: ["Moss slippery road corner", "Overgrown roadside vegetation", "Weeds cracking road shoulder"],
  Iron_grid_damage: ["Damaged iron culvert grid", "Broken stormwater drain grate", "Bent iron drain cover"],
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

export function generateMockReports(count: number = 40): HazardReport[] {
  const reports: HazardReport[] = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[Math.floor(seededRandom(i * 7 + 1) * categories.length)];
    const sev = severities[Math.floor(seededRandom(i * 13 + 2) * severities.length)] as Severity;
    const stat = statuses[Math.floor(seededRandom(i * 19 + 3) * statuses.length)] as Status;
    const loc = locations[i % locations.length];
    const catTitles = titles[cat] || titles.Pothole_Surface_Breakout;
    const title = catTitles[Math.floor(seededRandom(i * 23 + 4) * catTitles.length)];
    const daysBack = Math.floor(seededRandom(i * 31 + 5) * 60);

    const sevWeight = { critical: 40, high: 30, medium: 20, low: 10 }[sev];
    const catWeight = 15;
    const ageBonus = Math.min(daysBack * 0.5, 20);
    const priorityScore = Math.min(Math.round(sevWeight + catWeight + ageBonus), 100);

    const reportedAt = randomDate(daysBack, i * 41);
    const resolvedAt = stat === "resolved" ? randomDate(Math.max(0, daysBack - 5), i * 43) : undefined;

    reports.push({
      id: `RPT-${1000 + i}`,
      title,
      description: `Reported hazard at ${loc.address}. Requires inspection and appropriate maintenance action.`,
      category: cat,
      severity: sev,
      status: stat,
      location: { ...loc },
      images: [
        `https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&auto=format&fit=crop&q=60`,
      ],
      reportedBy: `Reporter #${(i % 12) + 1}`,
      reportedAt,
      updatedAt: resolvedAt || reportedAt,
      priorityScore,
    });
  }

  return reports.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export const mockReports = generateMockReports(40);

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
