'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Terminal, Shield, AlertTriangle, ChevronRight, Zap, Activity, Cpu } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import type { AssessmentQuestion, AssessmentOption, AssessmentResponse } from '@/types';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Assessment() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    const id = localStorage.getItem('student_id') || `stu-${Date.now()}`;
    setStudentId(id);
    localStorage.setItem('student_id', id);

    const fetchQuestions = async () => {
      // Neural Syncing Animation
      const messages = [
        "ESTABLISHING_SECURE_LINK...",
        "DECRYPTING_ORDEAL_PROTOCOLS...",
        "SYNCING_NEURAL_INTERFACE...",
        "UPLOADING_PSYCHOMETRIC_BANK...",
        "CALIBRATING_STRESS_VECTORS...",
        "SYSTEM_READY."
      ];
      
      for (let i = 0; i < messages.length; i++) {
        setTerminalLines(prev => [...prev, messages[i]]);
        setSyncProgress((i + 1) * (100 / messages.length));
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      try {
        const res = await fetch('/api/assessment/generate?num_per_section=5');
        if (!res.ok) throw new Error('PROTOCOL_FETCH_FAILURE');
        const data = await res.json();
        setQuestions(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'PROTOCOL_FETCH_FAILURE');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [authLoading]);

  const handleResponse = async (answer: string | number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setTimeout(async () => {
      const currentQ = questions[currentIndex];
      const newResponses = [...responses, { item_id: currentQ.id, response: answer }];
      
      setResponses(newResponses);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      } else {
        await submitAssessment(newResponses);
      }
    }, 400);
  };

  const submitAssessment = async (finalResponses: AssessmentResponse[]) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          responses: finalResponses
        }),
      });

      if (!res.ok) throw new Error('SUBMISSION_ERROR');
      
      router.push(`/dashboard/${studentId}`); 
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'SUBMISSION_ERROR');
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen title="Establishing Link" subtitle="Verifying Security Protocol..." />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-10"></div>
        
        <div className="w-full max-w-2xl z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <Cpu className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-cyan-400 text-sm font-bold tracking-[0.3em] uppercase">Neural_Syncing...</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Initializing_The_Ordeal</h2>
            <p className="text-[#bbc9cd] text-xs tracking-widest uppercase opacity-60">Do not disconnect from the interface</p>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
               <div className="h-full bg-cyan-500 transition-all duration-500 ease-out" style={{ width: `${syncProgress}%` }}></div>
            </div>
            
            <div className="space-y-4">
              {terminalLines.map((line, i) => (
                <div key={i} className="flex gap-4 text-xs">
                  <span className="text-white/20 font-bold">[{i.toString().padStart(2, '0')}]</span>
                  <span className={i === terminalLines.length - 1 ? "text-cyan-400 font-bold animate-pulse" : "text-cyan-400/60"}>
                    {line}
                  </span>
                </div>
              ))}
              <div className="flex gap-4 text-xs">
                <span className="text-white/20 font-bold">[{terminalLines.length.toString().padStart(2, '0')}]</span>
                <span className="w-2 h-4 bg-cyan-400 animate-bounce"></span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center gap-8">
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-2">Uptime</span>
                <span className="text-cyan-400/60 font-mono text-xs">99.999%</span>
             </div>
             <div className="w-[1px] h-8 bg-white/10"></div>
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-2">Enc_Mode</span>
                <span className="text-cyan-400/60 font-mono text-xs">AES-256</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-md bg-black/40 border border-red-500/20 p-8 rounded-lg text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
          <h2 className="text-red-500 text-2xl font-black mb-2 tracking-tighter uppercase">CORE_CORRUPTION</h2>
          <p className="text-red-400/70 text-sm mb-8 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-4 bg-red-950/20 text-red-500 border border-red-500/50 rounded-sm hover:bg-red-500 hover:text-white transition-all font-black tracking-[0.2em] uppercase text-xs"
          >
            PURGE_AND_REBOOT
          </button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center flex-col p-6 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-10"></div>
        <div className="relative w-32 h-32 mb-12">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10"></div>
          <div className="absolute inset-0 rounded-full border-t-4 border-cyan-400 animate-spin shadow-[0_0_30px_#06b6d4]"></div>
          <Shield className="absolute inset-0 m-auto w-12 h-12 text-cyan-400 animate-pulse" />
        </div>
        <div className="text-center z-10">
           <p className="text-cyan-400 text-sm tracking-[0.5em] font-black uppercase animate-pulse mb-4">COMPILING_LEGEND_MATRIX...</p>
           <p className="text-white/40 text-[10px] tracking-widest uppercase font-bold">Verifying integrity of responses</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLikert = currentQ.item_type.toLowerCase().includes('likert');
  const isSjt = currentQ.item_type.toLowerCase().includes('sjt');
  
  let parsedOptions: AssessmentOption[] | null = null;
  if (currentQ.options) {
      if (typeof currentQ.options === 'string') {
          try {
             parsedOptions = JSON.parse(currentQ.options);
          } catch(e) {
             parsedOptions = null;
          }
      } else {
          parsedOptions = currentQ.options as AssessmentOption[];
      }
  }

  const progressPercentage = ((currentIndex) / questions.length) * 100;

  return (
    <div className="text-[#dde4e5] selection:bg-cyan-500/30 selection:text-white pb-24 relative overflow-hidden">
      
      {/* Immersive Header */}
      <div className="w-full bg-black/60 border-b border-white/5 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex justify-between items-end font-mono mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded border border-indigo-500/30">
                 <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">IDENTIFIER</span>
                <span className="text-xs text-indigo-400 font-bold tracking-[0.2em]">STU-{studentId.split('-').pop()?.toUpperCase()}</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">ORDEAL_PROGRESS</span>
                 <span className="text-xs text-cyan-400 font-bold tabular-nums tracking-widest">{currentIndex + 1} / {questions.length}</span>
              </div>
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
                 <Activity className="w-3 h-3 text-green-500 animate-pulse" /> Live_Sync_Active
              </div>
            </div>
          </div>
          
          {/* Segmented Progress Bar */}
          <div className="relative h-2.5 w-full bg-white/5 rounded-sm overflow-hidden border border-white/5">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-700 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
            {/* 10% Segments */}
            <div className="absolute inset-0 flex justify-between">
              {[...Array(11)].map((_, i) => (
                <div key={i} className="h-full w-[1px] bg-black/40"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24 relative">
        <div className={`transition-all duration-500 transform ${isTransitioning ? 'opacity-0 -translate-y-8 scale-95 blur-sm' : 'opacity-100 translate-y-0 scale-100 blur-0'}`}>
          
          <div className="flex items-center gap-4 mb-12">
            <div className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-sm text-[10px] text-cyan-400 font-black uppercase tracking-[0.3em] shadow-inner">
              {currentQ.item_type}
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/40 via-cyan-500/5 to-transparent"></div>
            <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest font-bold">Vector_0{currentIndex + 1}</div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-20 leading-tight font-sans tracking-tight">
            <span className="text-cyan-400 font-mono mr-6 opacity-30 select-none text-4xl">[{String(currentIndex + 1).padStart(2, '0')}]</span>
            {currentQ.text}
          </h1>

          <div className="grid gap-8">
            {isLikert && (
              <div className="flex flex-col gap-12">
                <div className="flex justify-between px-4 font-mono text-[11px] text-cyan-400/40 uppercase tracking-[0.4em] font-bold">
                  <span>Strongly_Disagree</span>
                  <span>Strongly_Agree</span>
                </div>
                <div className="flex flex-wrap md:flex-nowrap justify-between gap-6">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => handleResponse(score)}
                      className="flex-1 min-w-[70px] h-24 md:h-40 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center text-3xl md:text-5xl font-black font-mono text-white/20 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all transform active:scale-95 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative z-10 transition-transform group-hover:scale-110">{score}</span>
                      <div className="absolute bottom-2 font-mono text-[8px] opacity-0 group-hover:opacity-30 tracking-widest">RANK_{score}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isSjt || !isLikert) && parsedOptions && Array.isArray(parsedOptions) && (
              <div className="grid gap-5">
                 {parsedOptions.map((opt: AssessmentOption, idx: number) => {
                    const val = opt.value || opt.id || String.fromCharCode(65 + idx);
                    const label = opt.label || opt.text || '';
                    return (
                      <button
                        key={idx}
                        onClick={() => handleResponse(val)}
                        className="w-full text-left p-8 md:p-10 rounded-sm border border-white/10 bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.1)] transition-all transform active:scale-[0.99] group flex items-start relative overflow-hidden"
                      >
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <div className="shrink-0 w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono font-black text-white/30 group-hover:text-indigo-400 mr-8 text-xl transition-all group-hover:scale-110 group-hover:border-indigo-500/30">
                            {val}
                         </div> 
                         <span className="text-xl md:text-2xl font-sans font-bold text-[#bbc9cd] group-hover:text-white transition-colors pt-1 flex-1 leading-tight">
                            {label}
                         </span>
                         <ChevronRight className="ml-6 w-8 h-8 text-white/10 group-hover:text-indigo-400 transition-all transform group-hover:translate-x-2 self-center" />
                      </button>
                    );
                 })}
              </div>
            )}

            {!isLikert && (!parsedOptions || !Array.isArray(parsedOptions)) && (
               <div className="relative group max-w-2xl mx-auto w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
                  <div className="relative">
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="WAITING_FOR_CANDIDATE_INPUT_"
                      className="w-full p-10 bg-black/60 border border-white/10 rounded-sm text-cyan-400 placeholder-white/10 focus:outline-none focus:border-cyan-400 focus:ring-0 text-2xl md:text-3xl transition-all font-mono tracking-wider shadow-inner"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                            handleResponse(e.currentTarget.value);
                        }
                      }}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                       <Zap className="w-8 h-8 text-white/10 group-focus-within:text-cyan-400 group-focus-within:animate-pulse transition-colors" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between font-mono text-[10px] text-white/20 uppercase tracking-[0.2em] px-2 font-bold">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div> Press [ENTER] to execute</span>
                    <span className="animate-pulse">_Link_Stable</span>
                  </div>
               </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Immersive Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      <div className="fixed bottom-8 left-8 hidden lg:block">
         <div className="flex flex-col gap-2 opacity-20">
            <div className="h-0.5 w-12 bg-white"></div>
            <div className="h-0.5 w-8 bg-white"></div>
            <div className="h-0.5 w-16 bg-white"></div>
         </div>
      </div>
      <div className="fixed bottom-8 right-8 hidden lg:block">
         <div className="font-mono text-[10px] text-white/10 uppercase tracking-[0.4em] font-bold rotate-90 origin-right">
            Neural_Sync_Established
         </div>
      </div>
    </div>
  );
}
