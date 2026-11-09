const defaultUrl = 'https://road-sentinel-backend.onrender.com/api';
const rawBase = (process.env.NEXT_PUBLIC_API_URL || defaultUrl).trim();
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

export async function fetchFromApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // 4 second timeout prevents UI from freezing on cold starts or offline backends
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${API_BASE}${cleanEndpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

const defaultFastApiUrl = 'http://127.0.0.1:8000';
const rawFastApi = (process.env.NEXT_PUBLIC_FASTAPI_URL || defaultFastApiUrl).trim();
export const FASTAPI_BASE = rawFastApi.replace(/\/+$/, '');

export function getFastApiWsUrl(path: string = '/ws/telemetry'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const wsProto = FASTAPI_BASE.startsWith('https') ? 'wss' : 'ws';
  const host = FASTAPI_BASE.replace(/^https?:\/\//, '');
  return `${wsProto}://${host}${cleanPath}`;
}

export async function fetchFromFastApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${FASTAPI_BASE}${cleanEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `FastAPI HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
