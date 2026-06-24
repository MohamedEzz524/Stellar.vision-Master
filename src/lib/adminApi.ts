/**
 * Admin API client.
 *
 * Tiny fetch wrapper that:
 *  - prepends the API base URL (proxied to /api in dev, full URL in prod)
 *  - injects the stored JWT as `Authorization: Bearer <token>`
 *  - normalises errors so callers always get either { data } or throws an `ApiError`
 *  - emits an `admin-token-expired` event when the server replies 401 so the
 *    AuthContext can sign the user out instead of every component handling it.
 */

const TOKEN_STORAGE_KEY = 'stellar_admin_token';
const EVENT_TOKEN_EXPIRED = 'admin-token-expired';

const getApiBaseUrl = (): string =>
  import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://stellar-vision-booking-api-production.up.railway.app/api';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ---------- Token storage ----------

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* storage disabled, silently ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

// ---------- Core request ----------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Bearer header (used by the login call itself). */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, skipAuth, signal } = options;
  const url = `${getApiBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      mode: 'cors',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error — backend unreachable');
  }

  // Try to parse JSON; some endpoints return empty bodies on success.
  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      // Token expired or invalid — tell the AuthContext to log out.
      window.dispatchEvent(new CustomEvent(EVENT_TOKEN_EXPIRED));
    }
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : null) ||
      `Request failed (${response.status})`;
    throw new ApiError(response.status, message, parsed);
  }

  return parsed as T;
}

// ---------- Typed endpoints ----------

export interface AdminLoginResponse {
  token: string;
  email: string;
  ttl: string;
}

export interface BookingItem {
  id: string;
  status: string;
  summary: string;
  description: string;
  start: { dateTime?: string; date?: string; timeZone?: string } | null;
  end: { dateTime?: string; date?: string; timeZone?: string } | null;
  htmlLink: string | null;
  created: string | null;
  updated: string | null;
  creator: { email?: string; displayName?: string } | null;
  organizer: { email?: string; displayName?: string } | null;
  attendees: Array<{ email?: string; displayName?: string }>;
}

export interface BookingsResponse {
  items: BookingItem[];
  nextPageToken: string | null;
  from: string;
  to: string;
}

export interface BlockedDate {
  date: string;
  reason: string;
  addedAt: string;
  addedBy: string;
}

export interface BusinessRules {
  enableActiveWeekWeekend: boolean;
  enableNextWeek: boolean;
  closedWeekdays: number[];
  workWindows: Array<{
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }>;
  activeWeekendWindows: Array<{
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }>;
}

export interface SettingsResponse {
  rules: BusinessRules;
  constants: {
    meetingDuration: number;
    minBookingHours: number;
    businessZone: string;
  };
}

export interface StatsResponse {
  total: number;
  past: number;
  upcoming: number;
  today: number;
  range: { from: string; to: string };
}

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    request<AdminLoginResponse>('/admin/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    }),
  verify: () => request<{ ok: true; email: string }>('/admin/verify'),

  // Stats
  stats: () => request<StatsResponse>('/admin/stats'),

  // Bookings
  bookings: (params: {
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
    pageToken?: string;
  } = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') search.set(k, String(v));
    });
    const qs = search.toString();
    return request<BookingsResponse>(`/admin/bookings${qs ? `?${qs}` : ''}`);
  },
  getBooking: (id: string) => request<BookingItem>(`/admin/bookings/${id}`),
  deleteBooking: (id: string) =>
    request<{ ok: true; id: string; deleted: true }>(`/admin/bookings/${id}`, {
      method: 'DELETE',
    }),
  patchBooking: (
    id: string,
    body: {
      slot_start_time?: string;
      timezone?: string;
      summary?: string;
      description?: string;
    },
  ) =>
    request<BookingItem>(`/admin/bookings/${id}`, {
      method: 'PATCH',
      body,
    }),

  // Blocked dates
  blockedDates: () =>
    request<{ items: BlockedDate[] }>('/admin/blocked-dates'),
  addBlockedDate: (date: string, reason?: string) =>
    request<{ ok: true; items: BlockedDate[] }>('/admin/blocked-dates', {
      method: 'POST',
      body: { date, reason },
    }),
  removeBlockedDate: (date: string) =>
    request<{ ok: true; items: BlockedDate[] }>(
      `/admin/blocked-dates/${date}`,
      { method: 'DELETE' },
    ),

  // Settings
  settings: () => request<SettingsResponse>('/admin/settings'),
  patchSettings: (body: Partial<BusinessRules>) =>
    request<{ ok: true; rules: BusinessRules }>('/admin/settings', {
      method: 'PATCH',
      body,
    }),
  resetSettings: () =>
    request<{ ok: true; rules: BusinessRules }>('/admin/settings/reset', {
      method: 'POST',
    }),
};

export const EVENTS = {
  TOKEN_EXPIRED: EVENT_TOKEN_EXPIRED,
};
