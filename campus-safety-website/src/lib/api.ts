const defaultUrl = 'https://road-sentinel-backend.onrender.com/api';
const rawBase = (process.env.NEXT_PUBLIC_API_URL || defaultUrl).trim();
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

const fastApiRaw = (process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000').trim();
const FASTAPI_BASE = fastApiRaw.replace(/\/+$/, '');

export async function fetchFromApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // 30 second timeout allows free-tier cloud backends (like Render) time to wake up from cold start
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const cleanBase = FASTAPI_BASE.replace(/^http:\/\//, '').replace(/^https:\/\//, '');
  const proto = isHttps ? 'wss://' : 'ws://';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${proto}${cleanBase}${cleanPath}`;
}
