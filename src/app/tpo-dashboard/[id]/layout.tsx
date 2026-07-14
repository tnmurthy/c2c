"use client";

import React from "react";
import Link from 'next/link';
import { useParams, useRouter, usePathname } from "next/navigation";
import { 
  Users, 
  Calendar,
  Plus,
  HelpCircle,
  LogOut,
  Home,
  LayoutDashboard
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase";

export default function TPODashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['institution'] });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return <LoadingScreen title="Authenticating Session" subtitle="Verifying TPO credentials..." />;
  }

  // Determine active tab
  const isHome = pathname === `/tpo-dashboard/${id}`;
  const isStudents = pathname === `/tpo-dashboard/${id}/students`;

  return (
    <div className="bg-[#0e1416] text-[#dde4e5] font-sans min-h-screen flex">
      {/* SideNavBar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1a2122]/90 backdrop-blur-2xl border-r border-white/5 h-screen sticky top-0 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#22d3ee]/20 flex items-center justify-center rounded">
              <LayoutDashboard className="text-[#8aebff] w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#8aebff]">TPO Command</h2>
              <p className={`text-[10px] text-[#bbc9cd] opacity-70 font-bold tracking-[0.1em] font-mono`}>ENTERPRISE TIER</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link href={`/tpo-dashboard/${id}`} className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-all ${isHome ? 'bg-[#22d3ee]/20 text-[#8aebff] border-l-4 border-[#8aebff]' : 'text-[#bbc9cd] hover:text-white'}`}>
              <Home className={`w-4 h-4 ${isHome ? 'text-[#8aebff]' : 'group-hover:translate-x-1 transition-transform'}`} />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Home</span>
            </Link>
            <Link href={`/tpo-dashboard/${id}/students`} className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-all ${isStudents ? 'bg-[#22d3ee]/20 text-[#8aebff] border-l-4 border-[#8aebff]' : 'text-[#bbc9cd] hover:text-white'}`}>
              <Users className={`w-4 h-4 ${isStudents ? 'text-[#8aebff]' : 'group-hover:translate-x-1 transition-transform'}`} />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Student Tracking</span>
            </Link>
            <Link href={`/tpo-dashboard/${id}/students`} className="flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 rounded-md group transition-colors">
              <Users className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Talent Pool</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 rounded-md group transition-colors">
              <Calendar className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Interviews</span>
            </Link>
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <button className="w-full bg-[#8aebff] text-[#00363e] py-3 text-[12px] font-bold tracking-[0.1em] rounded flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg">
            <Plus className="w-4 h-4" /> Post New Job
          </button>
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Support</span>
            </a>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 transition-colors text-left">
              <LogOut className="w-4 h-4" />
              <span className="text-[12px] font-bold tracking-[0.1em] font-mono">Logout</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Content wrapper */}
      <div className="flex-1 min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
