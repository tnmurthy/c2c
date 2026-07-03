import React from 'react';
import { ArrowUpRight, Users, Briefcase, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';

// Hardcoded for demo purposes
const TENANT_ID = '3ee2a6e1-77b7-492e-95dd-dda9ab189d56';

export default async function CRMDashboard() {
  // Fetch real counts
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);

  const { count: activeOpps } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .not('status', 'in', '("Closed Won","Closed Lost")');
    
  // For pipeline value, we need to sum expected_value
  const { data: opps } = await supabase
    .from('opportunities')
    .select('expected_value')
    .eq('tenant_id', TENANT_ID)
    .not('status', 'in', '("Closed Won","Closed Lost")');
    
  const pipelineValue = opps?.reduce((sum, opp) => sum + (Number(opp.expected_value) || 0), 0) || 0;

  // Fetch recent leads for activity feed
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('first_name, last_name, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(5);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-jetbrains text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of your pipeline and lead conversions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value={(totalLeads || 0).toString()} 
          change="Real-time data" 
          icon={<Users className="w-5 h-5 text-blue-400" />} 
        />
        <StatCard 
          title="Active Opportunities" 
          value={(activeOpps || 0).toString()} 
          change="Real-time data" 
          icon={<Briefcase className="w-5 h-5 text-emerald-400" />} 
        />
        <StatCard 
          title="Pipeline Value" 
          value={`$${pipelineValue.toLocaleString()}`} 
          change="Real-time data" 
          icon={<TrendingUp className="w-5 h-5 text-indigo-400" />} 
        />
        <StatCard 
          title="Conversion Rate" 
          value="--" 
          change="Pending analytics engine" 
          icon={<ArrowUpRight className="w-5 h-5 text-amber-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Pipeline by Stage</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg text-slate-500">
            [Chart Component Placeholder]
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentLeads?.length ? (
              recentLeads.map((lead, i) => (
                <div key={i} className="flex space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-200">New lead <span className="font-medium text-white">{lead.first_name} {lead.last_name}</span> created</p>
                    <p className="text-xs text-slate-500">{new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activities.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
