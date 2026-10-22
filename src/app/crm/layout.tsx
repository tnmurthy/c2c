import React from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, FileText, Settings, BarChart2, Contact, Calendar, Gauge } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import NavItem from '@/components/crm/NavItem';

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  let user: any = null;

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch {
    // Supabase server client might be offline
  }

  // Fallback to demo cookie authentication
  if (!user) {
    const cookieStore = cookies();
    const demoRole = cookieStore.get('demo_role')?.value;
    const demoUserRaw = cookieStore.get('demo_user')?.value;
    const isMockAuth = cookieStore.getAll().some(c => c.value.includes('demo-access-token'));

    if (demoRole === 'admin' || isMockAuth || demoUserRaw) {
      if (demoUserRaw) {
        try {
          user = JSON.parse(decodeURIComponent(demoUserRaw));
        } catch {}
      }
      if (!user) {
        user = {
          id: 'admin-001',
          email: 'admin@taliatech.in',
          user_metadata: { role: 'admin' },
          app_metadata: { role: 'admin' },
        };
      }
    }
  }

  if (!user) {
    redirect('/crm-login');
  }

  const role = user.user_metadata?.role || user.app_metadata?.role;
  const isAdmin = role === 'admin' || (user.email || '').endsWith('@taliatech.in');
  const isCrmUser = role === 'tenant_admin' || role === 'sales_exec' || isAdmin;
  // Matches the backend's /api/costs role check.
  const canSeeCosts = role === 'tenant_admin' || role === 'admin';
  
  if (!isCrmUser) {
    redirect('/crm-login');
  }

  // Fetch the CRM user profile which contains the tenant_id
  let crmUser: any = null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('crm_users')
      .select(`
        tenant_id, 
        name, 
        tenants (name)
      `)
      .eq('user_id', user.id)
      .single();
    crmUser = data;
  } catch {}

  if (!crmUser && !isAdmin) {
    redirect('/crm-login');
  }

  const tenantName = (Array.isArray(crmUser?.tenants) 
    ? crmUser?.tenants[0]?.name 
    : (crmUser?.tenants as any)?.name) || 'C2C Global Placement';
  const userName = crmUser?.name || user.email || 'Admin';
  const userInitials = userName.substring(0, 2).toUpperCase();

  const navItems = (
    <>
      <NavItem href="/crm" icon={<Home className="w-5 h-5" />} label="Dashboard" />
      <NavItem href="/crm/candidates" icon={<Users className="w-5 h-5" />} label="Talent Pool" />
      <NavItem href="/crm/leads" icon={<Users className="w-5 h-5" />} label="Leads" />
      <NavItem href="/crm/contacts" icon={<Contact className="w-5 h-5" />} label="Contacts" />
      <NavItem href="/crm/accounts" icon={<Briefcase className="w-5 h-5" />} label="Accounts" />
      <NavItem href="/crm/opportunities" icon={<BarChart2 className="w-5 h-5" />} label="Opportunities" />
      <NavItem href="/crm/activities" icon={<Calendar className="w-5 h-5" />} label="Activities" />
      <NavItem href="/crm/reports" icon={<FileText className="w-5 h-5" />} label="Reports" />
    </>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold font-jetbrains tracking-tight text-white">c2c <span className="text-blue-500">CRM</span></span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem href="/crm/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
          {canSeeCosts && <NavItem href="/crm/costs" icon={<Gauge className="w-5 h-5" />} label="Costs" />}
          <div className="mt-4 px-3 py-2 text-xs text-slate-500 font-mono">
            Tenant: {tenantName}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Phone: the sidebar links as a scrollable strip */}
        <nav aria-label="CRM" className="md:hidden flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/50 px-2 py-2 text-sm whitespace-nowrap">
          {navItems}
          {canSeeCosts && <NavItem href="/crm/costs" icon={<Gauge className="w-5 h-5" />} label="Costs" />}
        </nav>
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-900/30">
          <h1 className="text-lg font-medium text-white">CRM Workspace</h1>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm" title={userName}>
              {userInitials}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/50">
          {children}
        </div>
      </main>
    </div>
  );
}
