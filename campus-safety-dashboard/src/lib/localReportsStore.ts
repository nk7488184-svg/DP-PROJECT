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
    }
  } catch (e) {}
  return null;
}

export function getAllMergedReports(backendReports: HazardReport[] = []): HazardReport[] {
  const local = getLocalReports();
  const seenIds = new Set<string>();
  const merged: HazardReport[] = [];

  for (const r of local) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      merged.push(r);
    }
  }

  for (const r of backendReports) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      merged.push(r);
    }
  }

  for (const r of mockReports) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      merged.push(r);
    }
  }

  return merged;
}
