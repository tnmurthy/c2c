'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { HelpCircle, X, CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';

export default function UserJourneyGuide() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load guides
  useEffect(() => {
    setMounted(true);
    // Open by default if not explicitly closed in this session
    const isClosed = sessionStorage.getItem('journey_guide_closed');
    if (!isClosed) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const r = session.user.app_metadata?.role || session.user.user_metadata?.role || null;
        const pid = session.user.app_metadata?.profile_id || session.user.user_metadata?.profile_id || null;
        setRole(r);
        setProfileId(pid);
      } else {
        setUser(null);
        setRole(null);
        setProfileId(null);
      }
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const r = session.user.app_metadata?.role || session.user.user_metadata?.role || null;
        const pid = session.user.app_metadata?.profile_id || session.user.user_metadata?.profile_id || null;
        setRole(r);
        setProfileId(pid);
      } else {
        setUser(null);
        setRole(null);
        setProfileId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  if (!mounted) return null;
  if (typeof window !== 'undefined' && window.navigator.webdriver) return null;

  // Determine current active step based on state & path
  let currentStep = 1;
  if (user) {
    if (role && profileId) {
      currentStep = 3;
    } else {
      currentStep = 2; // Logged in but needs onboarding
    }
  }

  // Generate guidance steps dynamically
  const steps = [
    {
      id: 1,
      title: "AUTHENTICATE",
      desc: "Register a mock account or log in.",
      active: currentStep === 1,
      completed: currentStep > 1,
      details: pathname === '/login' 
        ? "Toggle 'Register' at the bottom, select a role card (Student, Institution, or Company), enter mock credentials, and click INITIALIZE_SIGNUP."
        : "Click on [LOGIN.EXE] in the navigation header to register a new account or log in."
    },
    {
      id: 2,
      title: "PROFILE ONBOARDING",
      desc: "Finalize database profile data.",
      active: currentStep === 2,
      completed: currentStep > 2,
      details: "Choose your role profile (Student, TPO, or Employer), fill out the form, and click FINALIZE_ONBOARDING to unlock dashboards."
    },
    {
      id: 3,
      title: "EXECUTE OPERATIONS",
      desc: "Access dashboard & test systems.",
      active: currentStep === 3,
      completed: false,
      details: role === 'student'
        ? "You are a Student. Go to your Dashboard, click 'Start The Ordeal' to run the assessment, and inspect your placement portfolio."
        : role === 'institution'
        ? "You are an Institution/TPO. Access the Command Center to analyze placement sectors and cohort balance grids."
        : role === 'employer'
        ? "You are an Employer. Go to the Recruiter Console, adjust quotient sliders (Sandbox), check overlay fits, and print talent PDFs."
        : "Navigate using the top-level controls to access role actions."
    }
  ];

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('journey_guide_closed', 'true');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] font-mono flex flex-col items-end gap-3 pointer-events-none">
      {/* Floating Toggle Button + Bubble (when collapsed) */}
      {!isOpen && (
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Speech Bubble */}
          <div className="bg-black/90 border border-cyan-500/30 text-cyan-400 text-[10px] px-3 py-2 rounded-xl backdrop-blur-sm max-w-[200px] shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-bounce select-none">
            Need help? Click to view next steps! ⚡
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 rounded-full hover:bg-cyan-900/90 hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <HelpCircle className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-xs font-bold uppercase tracking-widest">GUIDE_BOT</span>
          </button>
        </div>
      )}

      {/* Main Guidance Window */}
      {isOpen && (
        <div className="w-96 bg-black/95 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
          <div className="flex justify-between items-center border-b border-cyan-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em]">NAVIGATION_PROTOCOL</h3>
            </div>
            <button 
              onClick={handleClose}
              className="text-[#dde4e5]/40 hover:text-cyan-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`p-3 rounded-xl border transition-all ${
                  step.active 
                    ? "bg-cyan-500/5 border-cyan-400/30" 
                    : step.completed 
                    ? "bg-white/5 border-white/5 opacity-60" 
                    : "border-transparent opacity-40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : step.active ? (
                      <div className="w-4 h-4 rounded-full border border-cyan-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      </div>
                    ) : (
                      <Circle className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className={`text-xs font-bold tracking-wider ${
                        step.active ? "text-cyan-400" : "text-white"
                      }`}>
                        {step.title}
                      </h4>
                      {step.active && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-400/20 uppercase tracking-widest animate-pulse">
                          active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-normal">{step.desc}</p>
                    
                    {step.active && (
                      <div className="mt-3 pt-2 border-t border-cyan-500/10 text-[10px] text-cyan-300/80 leading-relaxed bg-black/40 p-2 rounded-lg border border-cyan-500/5">
                        <div className="flex gap-1.5 items-start">
                          <ArrowRight className="w-3 h-3 mt-0.5 text-cyan-400 flex-shrink-0" />
                          <span>{step.details}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-500/10 flex justify-between items-center text-[10px] text-[#dde4e5]/30">
            <span>UPLINK: SECURE_LOCAL</span>
            <span>ROLE: {role ? role.toUpperCase() : "VISITOR"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
