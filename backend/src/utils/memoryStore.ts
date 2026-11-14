export interface MockReport {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  location: { lat: number; lng: number; address: string };
  images: string[];
  reportedBy: any;
  reportedAt: string;
  updatedAt: string;
  priorityScore: number;
  mlPrediction?: any;
}

export const initialReports: MockReport[] = [];

// Helper to sanitize images - allows compressed base64 images up to 4MB for display
function sanitizeImages(images: any[]): string[] {
  if (!Array.isArray(images)) return [];
  return images.map(img => {
    if (typeof img !== 'string') return '';
    if (img.startsWith('data:image') && img.length > 4000000) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%2322c55e" width="100" height="100"/><text fill="%23ffffff" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12">Uploaded Photo</text></svg>';
    }
    return img;
  }).filter(Boolean);
}

class MemoryStore {
  private reports: MockReport[] = [...initialReports];

  getReports(query: any = {}) {
    let result = this.reports.map(r => ({
      ...r,
      images: sanitizeImages(r.images)
    }));
    if (query.category) result = result.filter(r => r.category === query.category);
    if (query.severity) result = result.filter(r => r.severity === query.severity);
    if (query.status) result = result.filter(r => r.status === query.status);
    if (query.search) {
      const s = String(query.search).toLowerCase();
      result = result.filter(r => (r.title && r.title.toLowerCase().includes(s)) || (r.location?.address && r.location.address.toLowerCase().includes(s)));
    }
    return result;
  }

  getById(id: string) {
    const target = String(id).trim().toLowerCase();
    const found = this.reports.find(r => 
      String(r.id).toLowerCase() === target || 
      String((r as any)._id).toLowerCase() === target
    );
    return found ? { ...found } : null;
  }

  addReport(reportData: any) {
    const id = `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: MockReport = {
      id,
      title: reportData.title || 'Hazard Report',
      description: reportData.description || '',
      category: reportData.category || 'other',
      severity: reportData.severity || 'medium',
      status: reportData.status || 'submitted',
      location: reportData.location || { lat: 31.7754, lng: 76.9861, address: 'IIT Mandi Campus' },
      images: sanitizeImages(reportData.images || []),
      reportedBy: reportData.reportedBy || { name: 'Campus Student' },
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priorityScore: reportData.priorityScore || 50,
      mlPrediction: reportData.mlPrediction || null,
    };
    this.reports.unshift(newReport);
    return newReport;
  }

  updateReport(id: string, updates: any) {
    const idx = this.reports.findIndex(r => r.id === id || (r as any)._id === id);
    if (idx === -1) return null;

    // Filter out undefined keys so we never overwrite existing fields with undefined!
    const cleanUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }

    this.reports[idx] = { 
      ...this.reports[idx], 
      ...cleanUpdates, 
      images: cleanUpdates.images ? sanitizeImages(cleanUpdates.images) : this.reports[idx].images,
      updatedAt: new Date().toISOString() 
    };
    return this.reports[idx];
  }

  getStats() {
    const totalReports = this.reports.length;
    const pending = this.reports.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
    const inProgress = this.reports.filter(r => r.status === 'in_progress').length;
    const resolved = this.reports.filter(r => r.status === 'resolved').length;
    return { totalReports, pending, inProgress, resolved };
  }
}

export const memoryStore = new MemoryStore();
