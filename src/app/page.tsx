import Link from 'next/link';
import { 
  Shield, 
  Zap, 
  Target, 
  Trophy, 
  ChevronRight, 
  Cpu, 
  Activity,
  Globe,
  Database,
  Lock
} from 'lucide-react';

export default function Home() {
  return (
    <div className="text-[#dde4e5] selection:bg-cyan-500/30">
      {/* Hero Section - Command Center */}
      <div className="relative isolate pt-14 overflow-hidden">
        {/* Ambient Background Elements */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-cyan-500 to-indigo-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-[1400px] px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <div className="flex items-center gap-x-4 mb-8">
              <div className="flex items-center gap-x-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
                <Activity className="w-3 h-3" /> System_Status: Online
              </div>
              <div className="h-[1px] w-12 bg-white/10"></div>
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em]">Protocol_v2.0.4</span>
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tighter text-white sm:text-7xl lg:text-8xl leading-[0.9] font-sans">
              THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">ULTIMATE ORDEAL</span> FOR FUTURE LEGENDS
            </h1>
            
            <p className="mt-8 text-xl leading-relaxed text-[#bbc9cd] font-medium max-w-xl">
              Bridge the gap between campus and corporate through high-fidelity simulations, neural benchmarks, and real-world intelligence.
            </p>
            
            <div className="mt-12 flex items-center gap-x-6">
              <Link
                href="/onboard"
                className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-widest uppercase text-xs rounded-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] overflow-hidden"
              >
                <span className="relative z-10">Initialize_Onboarding</span>
                <div className="absolute inset-0 translate-y-[100%] group-hover:translate-y-0 bg-white/10 transition-transform duration-300"></div>
              </Link>
              <Link href="/assessment" className="group flex items-center gap-x-2 text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono hover:text-white transition-colors">
                Enter_The_Ordeal <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Terminal Widget */}
            <div className="mt-16 max-w-lg">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Candidate_Live_Feed</span>
                </div>
                <div className="p-4 font-mono text-[11px] space-y-2">
                  <div className="flex gap-2 text-cyan-400/80">
                    <span className="text-white/20 shrink-0">[12:44:01]</span>
                    <span>NEW_ASSESSMENT_INITIALIZED: USER_STU_4421</span>
                  </div>
                  <div className="flex gap-2 text-indigo-400/80">
                    <span className="text-white/20 shrink-0">[12:44:18]</span>
                    <span>COGNITIVE_MATCH_DETECTED: THE_ARCHITECT (98%)</span>
                  </div>
                  <div className="flex gap-2 text-green-400/80">
                    <span className="text-white/20 shrink-0">[12:45:03]</span>
                    <span>PORTFOLIO_GENERATED: LEGEND_STATUS_CERTIFIED</span>
                  </div>
                  <div className="flex gap-2 animate-pulse">
                    <span className="text-white/20 shrink-0">[12:45:10]</span>
                    <span className="text-cyan-400">AWAITING_INPUT_</span>
                    <span className="w-2 h-3 bg-cyan-400 ml-[-4px]"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Visuals - High Tech Grid */}
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow relative">
            <div className="relative mx-auto w-full max-w-[600px] aspect-square">
              {/* Complex Decorative SVG */}
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Rotating Circles */}
                <circle cx="200" cy="200" r="180" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="1" fill="none" className="animate-[spin_20s_linear_infinite]" />
                <circle cx="200" cy="200" r="140" stroke="rgba(79, 70, 229, 0.2)" strokeWidth="1" fill="none" strokeDasharray="10 20" className="animate-[spin_15s_linear_infinite_reverse]" />
                <circle cx="200" cy="200" r="100" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="2" fill="none" strokeDasharray="1 10" className="animate-[spin_10s_linear_infinite]" />
                
                {/* Hexagon Grid */}
                <path d="M200 120 L270 160 L270 240 L200 280 L130 240 L130 160 Z" fill="url(#grad1)" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="2" className="animate-pulse" />
                
                {/* Data Points */}
                <circle cx="200" cy="120" r="4" fill="#22d3ee" className="animate-ping" />
                <circle cx="270" cy="240" r="4" fill="#4f46e5" className="animate-ping" style={{ animationDelay: '1s' }} />
                <circle cx="130" cy="160" r="4" fill="#22d3ee" className="animate-ping" style={{ animationDelay: '2s' }} />
              </svg>
              
              {/* Floating Cards */}
              <div className="absolute top-10 right-0 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-bounce" style={{ animationDuration: '4s' }}>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                       <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                       <div className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Tech_Fit</div>
                       <div className="text-2xl font-black text-white">98.4%</div>
                    </div>
                 </div>
              </div>

              <div className="absolute bottom-20 left-0 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                       <Target className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                       <div className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Market_Sync</div>
                       <div className="text-2xl font-black text-white">Verified</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-xs font-bold tracking-[0.4em] text-cyan-400 uppercase font-mono">System_Capabilities</h2>
            <p className="mt-4 text-4xl font-black tracking-tighter text-white sm:text-5xl">
              PRECISION EVALUATION. <span className="text-white/40">NO COMPROMISE.</span>
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-8 lg:max-w-none lg:grid-cols-4">
              {[
                { 
                  name: 'Market Scout', 
                  desc: 'Neural mapping of current industry demands and hidden leads.', 
                  icon: Globe,
                  bgClass: 'bg-cyan-500/5 group-hover:bg-cyan-500/10',
                  iconBg: 'bg-cyan-500/10 border-cyan-500/20',
                  iconText: 'text-cyan-400'
                },
                { 
                  name: 'Skills Audit', 
                  desc: 'High-fidelity gap analysis against top-tier corporate benchmarks.', 
                  icon: Cpu,
                  bgClass: 'bg-indigo-500/5 group-hover:bg-indigo-500/10',
                  iconBg: 'bg-indigo-500/10 border-indigo-500/20',
                  iconText: 'text-indigo-400'
                },
                { 
                  name: 'The Ordeal', 
                  desc: 'Stress-tested simulations designed to identify elite talent.', 
                  icon: Shield,
                  bgClass: 'bg-indigo-500/5 group-hover:bg-indigo-500/10',
                  iconBg: 'bg-indigo-500/10 border-indigo-500/20',
                  iconText: 'text-indigo-400'
                },
                { 
                  name: 'Legend Status', 
                  desc: 'Immutable verification of your capabilities and market fit.', 
                  icon: Trophy,
                  bgClass: 'bg-cyan-500/5 group-hover:bg-cyan-500/10',
                  iconBg: 'bg-cyan-500/10 border-cyan-500/20',
                  iconText: 'text-cyan-400'
                },
              ].map((feature, i) => (
                <div key={feature.name} className="relative p-8 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/[0.08] transition-all hover:-translate-y-2">
                  <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl transition-colors ${feature.bgClass}`}></div>
                  <dt className="flex flex-col gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${feature.iconBg}`}>
                      <feature.icon className={`h-6 w-6 ${feature.iconText}`} />
                    </div>
                    <div className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Protocol_0{i+1}</div>
                    <span className="text-xl font-bold text-white tracking-tight">{feature.name}</span>
                  </dt>
                  <dd className="mt-4 text-sm leading-relaxed text-[#bbc9cd] relative z-10">{feature.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative isolate py-24 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-indigo-900/40 to-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 md:p-24 overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-cyber-grid bg-[length:40px_40px] opacity-10"></div>
            
            <h2 className="text-4xl font-black tracking-tighter text-white sm:text-6xl relative z-10">
              READY TO BECOME <span className="text-cyan-400">A LEGEND?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-[#bbc9cd] relative z-10">
              Join the elite ranks of candidates who have passed the ordeal and secured high-impact roles at leading tech firms.
            </p>
            <div className="mt-12 flex items-center justify-center gap-x-6 relative z-10">
              <Link
                href="/onboard"
                className="px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase text-sm rounded-sm transition-all shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)]"
              >
                INITIALIZE_SYSTEM
              </Link>
            </div>
            
            {/* Decorative Grid Icons */}
            <div className="absolute bottom-4 left-4 opacity-10"><Database className="w-12 h-12" /></div>
            <div className="absolute top-4 right-4 opacity-10"><Lock className="w-12 h-12" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
