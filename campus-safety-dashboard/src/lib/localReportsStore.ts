import type { HazardReport } from "@/types";
import { mockReports } from "./mock-data";

const LOCAL_STORAGE_KEY = "campus_safety_local_reports";

export function getLocalReports(): HazardReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalReport(report: HazardReport): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalReports();
    const filtered = existing.filter((r) => r.id !== report.id);
    const updated = [report, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("campus-reports-updated", { detail: report }));
  } catch (e) {
    console.warn("Could not save report to localStorage:", e);
  }
}

export function updateLocalReport(id: string, updates: Partial<HazardReport>): HazardReport | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = getLocalReports();
    const idx = existing.findIndex((r) => r.id === id);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("campus-reports-updated", { detail: existing[idx] }));
      return existing[idx];
    } else {
      const newEntry = { id, ...updates, updatedAt: new Date().toISOString() } as HazardReport;
      existing.unshift(newEntry);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("campus-reports-updated", { detail: newEntry }));
      return newEntry;
    }
  } catch (e) {}
  return null;
}

export function getAllMergedReports(backendReports: HazardReport[] = []): HazardReport[] {
  const local = getLocalReports();
  const seenIds = new Set<string>();
  const merged: HazardReport[] = [];

  // Map local updates by ID for quick lookup to preserve fresher client-side state
  const localMap = new Map<string, HazardReport>();
  for (const r of local) {
    if (r && r.id) localMap.set(r.id, r);
  }

  // 1. First include freshly fetched reports from backend, overlaying newer local updates if available
  for (const r of backendReports) {
    if (r && r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      const localVer = localMap.get(r.id);
      if (localVer) {
        const localTime = localVer.updatedAt ? new Date(localVer.updatedAt).getTime() : 0;
        const backendTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
        const isRecentLocalUpdate = (Date.now() - localTime) < 30000;
        if (isRecentLocalUpdate || localTime >= backendTime) {
          merged.push({ ...r, ...localVer });
          continue;
        }
      }
      merged.push(r);
    }
  }

  // 2. Include any local client-side reports NOT already from the backend (e.g. submitted offline or from website)
  for (const r of local) {
    if (r && r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      merged.push(r);
    }
  }

  // 3. ONLY use mock baseline reports when the backend returned ZERO reports (offline / unreachable)
  if (backendReports.length === 0) {
    for (const r of mockReports) {
      if (r && r.id && !seenIds.has(r.id)) {
        seenIds.add(r.id);
        const localVer = localMap.get(r.id);
        if (localVer) {
          merged.push({ ...r, ...localVer });
        } else {
          merged.push(r);
        }
      }
    }
  }

  // Sort by reportedAt descending (newest on top)
  merged.sort((a, b) => {
    const timeA = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
    const timeB = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
    return timeB - timeA;
  });

  return merged;
}
