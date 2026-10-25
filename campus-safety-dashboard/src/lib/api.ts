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
