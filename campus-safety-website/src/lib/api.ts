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

const fastApiRaw = (process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000').trim();
const FASTAPI_BASE = fastApiRaw.replace(/\/+$/, '');

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
      // If aborted or connection refused, try next candidate URL
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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const cleanBase = FASTAPI_BASE.replace(/^http:\/\//, '').replace(/^https:\/\//, '');
  const proto = isHttps ? 'wss://' : 'ws://';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${proto}${cleanBase}${cleanPath}`;
}
