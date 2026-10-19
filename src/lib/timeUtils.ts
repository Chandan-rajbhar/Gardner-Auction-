/**
 * Gardner Auction - Universal Server-Synchronized Time Utilities
 * Adheres strictly to UTC database storage, client-side Intl localization,
 * and dynamic server clock skew synchronization.
 */

let serverTimeSkewMs = 0;

// Initialize cached skew from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const cachedSkew = localStorage.getItem('gardner_server_time_skew_ms');
    if (cachedSkew !== null) {
      const parsed = Number(cachedSkew);
      if (!isNaN(parsed) && Math.abs(parsed) < 86400000) {
        serverTimeSkewMs = parsed;
      }
    }
  } catch (_) {}
}

export const getSyncedNow = (): number => {
  return Date.now() + serverTimeSkewMs;
};

export const getSyncedDate = (): Date => {
  return new Date(getSyncedNow());
};

export const getSyncedIsoString = (): string => {
  return new Date(getSyncedNow()).toISOString();
};

export const getServerTimeSkew = (): number => {
  return serverTimeSkewMs;
};

/**
 * Updates the server-time skew when a verified server response timestamp is received
 * (e.g. from HTTP response Date header or Supabase rest endpoint).
 */
export const updateServerTimeSkew = (serverDateHeaderOrMs: string | number | null | undefined): void => {
  if (!serverDateHeaderOrMs) return;
  try {
    let serverMs: number | null = null;
    if (typeof serverDateHeaderOrMs === 'number') {
      serverMs = serverDateHeaderOrMs;
    } else if (typeof serverDateHeaderOrMs === 'string') {
      const parsed = new Date(serverDateHeaderOrMs).getTime();
      if (!isNaN(parsed)) serverMs = parsed;
    }
    if (serverMs === null) return;

    const clientNow = Date.now();
    const newSkew = serverMs - clientNow;

    if (Math.abs(newSkew - serverTimeSkewMs) > 1000 || serverTimeSkewMs === 0) {
      serverTimeSkewMs = newSkew;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gardner_server_time_skew_ms', String(newSkew));
          window.dispatchEvent(
            new CustomEvent('gardner:time-sync', { detail: { skew: newSkew, syncedNow: getSyncedNow() } })
          );
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('[timeUtils] Error updating server time skew:', e);
  }
};

export const parseDate = (input: unknown): Date | null => {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  try {
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return null;
      if (/^\d{10,13}$/.test(trimmed)) {
        const num = Number(trimmed);
        const d = new Date(num > 1e11 ? num : num * 1000);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
  } catch (_) {}
  return null;
};

export const formatExactDateTime = (
  input: unknown, 
  options: Intl.DateTimeFormatOptions & { fallback?: string; locale?: string } = {}
): string => {
  const date = parseDate(input);
  if (!date) return options.fallback || '';
  try {
    return new Intl.DateTimeFormat(options.locale || undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options,
    }).format(date);
  } catch (_) {
    return date.toLocaleString();
  }
};

export const formatRelativeTime = (input: unknown, options: { fallback?: string } = {}): string => {
  const date = parseDate(input);
  if (!date) return options.fallback !== undefined ? options.fallback : '';

  const now = getSyncedNow();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  if (diffInSeconds < 0 && diffInSeconds >= -45) return 'Just now';
  if (diffInSeconds < -45) return formatExactDateTime(date);
  if (diffInSeconds < 45) return 'Just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes <= 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours <= 1 ? '1 hr ago' : `${diffInHours} hrs ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays <= 1 ? '1 day ago' : `${diffInDays} days ago`;
  }

  return formatExactDateTime(date);
};
