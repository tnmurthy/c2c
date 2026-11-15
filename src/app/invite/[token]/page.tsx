'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import { clearPendingInvite, rememberInvite } from '@/lib/pendingInvite';

interface InviteInfo {
  email: string;
  role: string;
  role_label: string;
  state: 'open' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  institution: string | null;
  department: string | null;
  tenant: string | null;
  email_matches: boolean;
}

async function detail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        rememberInvite(token);
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setSignedInAs(session.user.email ?? null);
      const res = await authFetch('/api/tenancy/invites/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (cancelled) return;
      if (res.ok) setInfo(await res.json());
      else setError(await detail(res));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const signOutAndSwitch = async () => {
    rememberInvite(token);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const accept = async () => {
    setAccepting(true);
    setError(null);
    const res = await authFetch('/api/tenancy/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      setError(await detail(res));
      setAccepting(false);
      return;
    }
    const out = await res.json();
    clearPendingInvite();
    if (out.refresh_session) await supabase.auth.refreshSession(); // pick up the new role
    router.push(out.institution_id ? `/tpo-dashboard/${out.institution_id}` : '/tpo-dashboard');
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono">
      <div className="bg-black/60 border border-cyan-900/40 p-8 rounded-xl max-w-lg w-full space-y-5">{children}</div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex items-center gap-3 text-cyan-400/80 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" /> Checking your invite…
      </div>
    );
  }

  if (!signedInAs) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">You have a c2c invite</h1>
        <p className="text-sm text-[#bbc9cd]">
          Sign in, or create an account, with the email address the invite was sent to. You&apos;ll come back here to accept it.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-widest py-3 rounded"
        >
          Sign in to continue
        </button>
      </>
    );
  }

  if (error && !info) {
    return shell(
      <div className="flex items-start gap-3 text-rose-400 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" /> <span>{error}</span>
      </div>
    );
  }

  if (!info) return shell(<p className="text-sm text-[#bbc9cd]">Invite not found.</p>);

  const where = [info.department, info.institution ?? info.tenant].filter(Boolean).join(', ');

  return shell(
    <>
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Join {info.institution ?? info.tenant}</h1>
      </div>
      <p className="text-sm text-[#bbc9cd]">
        You&apos;ve been invited as <span className="text-white font-bold">{info.role_label}</span>
        {where ? <> for <span className="text-white">{where}</span></> : null}.
      </p>
      <p className="text-xs text-white/50">Invite for {info.email} · expires {new Date(info.expires_at).toLocaleString()}</p>

      {info.state !== 'open' && (
        <p className="text-sm text-amber-400">This invite has been {info.state}. Ask whoever invited you for a new link.</p>
      )}

      {info.state === 'open' && !info.email_matches && (
        <div className="space-y-3">
          <p className="text-sm text-amber-400">
            You&apos;re signed in as {signedInAs}. Sign in as {info.email} to accept.
          </p>
          <button onClick={signOutAndSwitch} className="w-full border border-cyan-700 text-cyan-300 text-xs uppercase tracking-widest py-3 rounded hover:bg-cyan-950/40">
            Switch account
          </button>
        </div>
      )}

      {info.state === 'open' && info.email_matches && (
        <button
          onClick={accept}
          disabled={accepting}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-slate-950 font-bold text-xs uppercase tracking-widest py-3 rounded flex items-center justify-center gap-2"
        >
          {accepting && <Loader2 className="w-4 h-4 animate-spin" />} Accept invite
        </button>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}
    </>
  );
}
