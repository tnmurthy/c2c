/**
 * Single source of truth for the demo/client-preview session.
 *
 * The demo session is a client-side stand-in for a real Supabase session: it
 * writes `demo_role` / `demo_user` cookies that the middleware and the auth
 * hooks recognise. It was previously open-coded in four places with slightly
 * different rules, which is how the "any 6-character password grants admin"
 * bypass and the "logout does not log you out" bug both arose.
 *
 * Two rules this module exists to enforce:
 *  1. Only an exact demo email paired with the exact demo password is a demo
 *     login. No substring matching on the email, no password-length shortcut.
 *  2. Clearing the session clears *every* artefact it wrote — cookies and
 *     localStorage alike — so `signOut()` actually signs the user out.
 */

export type DemoRole = 'student' | 'institution' | 'employer' | 'admin';

/**
 * Demo sessions exist only where NEXT_PUBLIC_ALLOW_DEMO_AUTH=true (local dev,
 * Playwright). The backend has the matching ALLOW_DEMO_AUTH switch; production
 * sets neither, so every visitor signs in with a real account there.
 */
export const DEMO_AUTH_ENABLED = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === 'true';

export interface DemoUser {
  id: string;
  email: string;
  app_metadata: { role: DemoRole; profile_id: string; tenant_id: string };
  user_metadata: { role: DemoRole; profile_id: string; tenant_id: string };
}

/** The one password that unlocks a demo account. Published on the login page. */
export const DEMO_PASSWORD = 'c2c@2026';

const DEMO_TENANT_ID = 'tenant-001';

export const DEMO_PROFILE_IDS: Record<DemoRole, string> = {
  student: 'stu-001',
  institution: 'inst-001',
  employer: 'emp-001',
  admin: 'admin-001',
};

/**
 * Exhaustive allow-list of demo accounts. An email not listed here is never a
 * demo account, however much it looks like one.
 */
export const DEMO_ACCOUNTS: Record<string, DemoRole> = {
  'student@c2c.demo': 'student',
  'student@c2c.edu': 'student',
  'student@mytestbed.tech': 'student',
  'institution@c2c.demo': 'institution',
  'institution@c2c.edu': 'institution',
  'tpo@c2c.demo': 'institution',
  'employer@c2c.demo': 'employer',
  'employer@c2c.edu': 'employer',
  'admin@c2c.demo': 'admin',
  'admin@c2c.edu': 'admin',
  'admin@taliatech.in': 'admin',
};

/**
 * Resolve a login attempt to a demo role, or null if it is not a demo login.
 * Both the email and the password must match exactly.
 */
export function resolveDemoAccount(email: string, password: string): DemoRole | null {
  if (!DEMO_AUTH_ENABLED || password !== DEMO_PASSWORD) return null;
  return DEMO_ACCOUNTS[email.trim().toLowerCase()] ?? null;
}

/**
 * Supabase storage keys are namespaced by project ref. Derive it from the
 * configured URL rather than hardcoding, so a project rotation does not
 * silently orphan every stored session.
 */
export function getSupabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return url.split('//')[1]?.split('.')[0] || 'placeholder';
}

export function getAuthTokenKey(): string {
  return `sb-${getSupabaseProjectRef()}-auth-token`;
}

export function buildDemoUser(role: DemoRole, email?: string, profileId?: string): DemoUser {
  const metadata = {
    role,
    profile_id: profileId || DEMO_PROFILE_IDS[role],
    tenant_id: DEMO_TENANT_ID,
  };
  return {
    id: `${role}-001`,
    email: email?.trim().toLowerCase() || `${role}@c2c.demo`,
    app_metadata: metadata,
    user_metadata: metadata,
  };
}

const COOKIE_MAX_AGE_SECONDS = 604800; // 7 days

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function setDemoSession(user: DemoUser): void {
  if (!DEMO_AUTH_ENABLED || typeof document === 'undefined') return;

  const tokenKey = getAuthTokenKey();
  const token = JSON.stringify({
    access_token: 'demo-access-token',
    token_type: 'bearer',
    user,
    expires_at: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS,
  });

  writeCookie(tokenKey, encodeURIComponent(token));
  writeCookie('demo_role', user.app_metadata.role);
  writeCookie('demo_user', encodeURIComponent(JSON.stringify(user)));

  try {
    localStorage.setItem(tokenKey, token);
    localStorage.setItem('demo_user', JSON.stringify(user));
    localStorage.setItem('demo_role', user.app_metadata.role);
  } catch {
    // localStorage unavailable (private mode, blocked storage) — cookies suffice.
  }
}

/**
 * Remove every artefact `setDemoSession` writes. Call this alongside
 * `supabase.auth.signOut()`, which only knows about real Supabase sessions.
 */
export function clearDemoSession(): void {
  if (typeof document === 'undefined') return;

  const tokenKey = getAuthTokenKey();
  deleteCookie(tokenKey);
  deleteCookie('demo_role');
  deleteCookie('demo_user');

  try {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_role');
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function parseDemoUser(raw: string): DemoUser | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed?.app_metadata?.role ? (parsed as DemoUser) : null;
  } catch {
    return null;
  }
}

/** Read the current demo session, from cookies first and localStorage second. */
export function getDemoUser(): DemoUser | null {
  if (!DEMO_AUTH_ENABLED || typeof document === 'undefined') return null;

  try {
    const cookieUser = readCookie('demo_user');
    if (cookieUser) {
      const parsed = parseDemoUser(cookieUser);
      if (parsed) return parsed;
    }

    const cookieRole = readCookie('demo_role');
    if (cookieRole && cookieRole in DEMO_PROFILE_IDS) {
      return buildDemoUser(cookieRole as DemoRole);
    }

    const storedUser = localStorage.getItem('demo_user');
    if (storedUser) {
      const parsed = parseDemoUser(storedUser);
      if (parsed) return parsed;
    }

    const storedRole = localStorage.getItem('demo_role');
    if (storedRole && storedRole in DEMO_PROFILE_IDS) {
      return buildDemoUser(storedRole as DemoRole);
    }
  } catch {
    // Unreadable storage is treated as "no demo session".
  }

  return null;
}
