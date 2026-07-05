import React from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, FileText, Settings, BarChart2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/crm-login');
  }

  // Fetch the CRM user profile which contains the tenant_id
  const { data: crmUser } = await supabase
    .from('crm_users')
    .select(`
      tenant_id, 
      name, 
      tenants (name)
    `)
    .eq('user_id', user.id)
    .single();

  const tenantName = (Array.isArray(crmUser?.tenants) 
    ? crmUser?.tenants[0]?.name 
    : (crmUser?.tenants as any)?.name) || 'Unknown Tenant';
  const userName = crmUser?.name || user.email || 'User';
  const userInitials = userName.substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold font-jetbrains tracking-tight text-white">c2c <span className="text-blue-500">CRM</span></span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem href="/crm" icon={<Home className="w-5 h-5" />} label="Dashboard" />
          <NavItem href="/crm/candidates" icon={<Users className="w-5 h-5" />} label="Talent Pool" />
          <NavItem href="/crm/leads" icon={<Users className="w-5 h-5" />} label="Leads" />
          <NavItem href="/crm/accounts" icon={<Briefcase className="w-5 h-5" />} label="Accounts" />
          <NavItem href="/crm/opportunities" icon={<BarChart2 className="w-5 h-5" />} label="Opportunities" />
          <NavItem href="/crm/reports" icon={<FileText className="w-5 h-5" />} label="Reports" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem href="/crm/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
          <div className="mt-4 px-3 py-2 text-xs text-slate-500 font-mono">
            Tenant: {tenantName}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/30">
          <h1 className="text-lg font-medium text-white">CRM Workspace</h1>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm" title={userName}>
              {userInitials}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
