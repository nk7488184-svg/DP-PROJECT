const DEFAULT_PROD_URL = 'https://road-sentinel-backend.onrender.com/api';
const LOCAL_DEV_URL = 'http://localhost:3001/api';

function getApiCandidates(): string[] {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowserLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (envUrl) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    const formatted = clean.endsWith('/api') ? clean : `${clean}/api`;
    return [formatted, LOCAL_DEV_URL, DEFAULT_PROD_URL];
  }

  if (isBrowserLocal) {
    return [LOCAL_DEV_URL, DEFAULT_PROD_URL];
  }

  return [DEFAULT_PROD_URL, LOCAL_DEV_URL];
}

const defaultFastApiUrl = 'http://127.0.0.1:8000';
const rawFastApi = (process.env.NEXT_PUBLIC_FASTAPI_URL || defaultFastApiUrl).trim();
export const FASTAPI_BASE = rawFastApi.replace(/\/+$/, '');

export async function fetchFromApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const candidates = getApiCandidates();
  let lastError: any = null;

  for (const base of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${base}${cleanEndpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      // If server returned 4xx (except 404), throw immediately as it's a client/validation error
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${res.status}`);
      }

      lastError = new Error(`HTTP error! status: ${res.status}`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      // If connection refused, try next candidate URL
    }
  }

  throw lastError || new Error('All API endpoints failed.');
}

export async function fetchFromFastApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${FASTAPI_BASE}${cleanEndpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `FastAPI error! status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function getFastApiWsUrl(path: string = '/ws/telemetry'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const wsProto = FASTAPI_BASE.startsWith('https') ? 'wss' : 'ws';
  const host = FASTAPI_BASE.replace(/^https?:\/\//, '');
  return `${wsProto}://${host}${cleanPath}`;
}

export async function fetchRecentTelemetry(minutes: number = 120, deviceId?: string) {
  const params = new URLSearchParams({ minutes: minutes.toString() });
  if (deviceId) {
    params.append('device_id', deviceId);
  }
  return fetchFromFastApi<{
    success: boolean;
    window_minutes: number;
    summaries: Array<{
      timestamp: string;
      avg_speed: number;
      vehicle_count: number;
      flow_rate_vph: number;
      speed_85th_percentile: number;
      congestion_status: string;
      overspeed_count: number;
      device_id: string;
      road_name: string;
    }>;
    breaches: Array<{
      breach_id: string;
      timestamp: string;
      speed: number;
      speed_kmh: number;
      posted_limit: number;
      delta_over_limit: number;
      plate_text: string;
      license_plate: string;
      image_url?: string;
      vehicle_type: string;
      severity: string;
      ocr_confidence: number;
      fine_suppressed: boolean;
      device_id: string;
      road_name: string;
    }>;
    analytics: {
      total_vehicles_observed: number;
      total_violations: number;
      compliance_rate_pct: number;
      peak_violation_hour: string;
      speed_distribution: Record<string, number>;
      vehicle_type_breakdown: Record<string, number>;
    };
    stats: any;
  }>(`/api/v1/telemetry/recent?${params.toString()}`);
}
