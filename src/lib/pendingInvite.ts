'use client';

/**
 * Remembers an invite link across sign-in / sign-up (including Google OAuth and
 * email confirmation in a new tab), so the user lands back on /invite/<token>.
 * Kept for at most 72 h, the invite's own lifetime; cleared once used.
 */
const KEY = 'c2c_pending_invite';
const TTL_MS = 72 * 60 * 60 * 1000;

export function rememberInvite(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    /* storage unavailable: the user can reopen the link */
  }
}

export function pendingInvitePath(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
    if (!token || !at || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return `/invite/${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
