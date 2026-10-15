export default function Footer() {
  return (
    <footer className="bg-[#0e1416] border-t border-white/5 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-[0.02]"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-mono font-black tracking-tighter text-xl text-white">
              C2C<span className="text-cyan-400">.SYST</span>
            </span>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
              Neural_Recruitment_Infrastructure
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              title="X / Twitter"
              className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-cyan-400 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 fill-current group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              title="Meta (Instagram / Threads)"
              className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-cyan-400 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              title="LinkedIn"
              className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-cyan-400 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 fill-current group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.25a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
              </svg>
            </a>
            <a
              href="https://github.com/tnmurthy/c2c"
              target="_blank"
              rel="noreferrer"
              title="GitHub"
              className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-cyan-400 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 fill-current group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>

          <div className="flex gap-8 font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">
            <a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy_Protocol</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Security_Audit</a>
          </div>

          <p className="text-center text-[10px] font-mono text-white/20 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} C2C.OS_BUILD_v2.0.4. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
