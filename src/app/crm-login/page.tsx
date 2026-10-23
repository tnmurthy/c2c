'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, KeyRound } from 'lucide-react'
import {
  DEMO_ACCOUNTS,
  DEMO_AUTH_ENABLED,
  DEMO_PASSWORD,
  buildDemoUser,
  resolveDemoAccount,
  setDemoSession,
} from '@/lib/demoSession'

export default function CRMLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('admin@taliatech.in')
  const [password, setPassword] = useState('c2c@2026')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loginDemoCRM = (cleanEmail: string) => {
    setDemoSession(buildDemoUser('admin', cleanEmail))
    router.refresh()
    router.push('/crm')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    // Exact demo email + exact demo password only. Matching on `includes('admin')`
    // with any six-character password handed CRM admin to any visitor.
    if (resolveDemoAccount(cleanEmail, password) === 'admin') {
      loginDemoCRM(cleanEmail)
      setLoading(false)
      return
    }

    if (DEMO_AUTH_ENABLED && DEMO_ACCOUNTS[cleanEmail] === 'admin') {
      setError(`Wrong password for the demo account. Use ${DEMO_PASSWORD}.`)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) throw error

      if (data.user) {
        router.refresh()
        router.push('/crm')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-jetbrains tracking-tight text-white mb-2">
            c2c <span className="text-blue-500">CRM</span>
          </h1>
          <p className="text-slate-400 text-sm">Internal Team Portal</p>
        </div>

        {DEMO_AUTH_ENABLED && (<>
        {/* Demo Credentials Box */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-900 border border-blue-500/30 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-blue-400" /> Client Demo Account
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              PW: c2c@2026
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Admin Email:</span>
            <code className="text-blue-300">admin@taliatech.in</code>
          </div>
        </div>

        </>)}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="admin@taliatech.in"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In to CRM
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Quick Demo Access */}
            <div className="pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => loginDemoCRM('admin@taliatech.in')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 transition-all"
              >
                ⚡ 1-Click Demo Access (Admin)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
