import React from 'react';
import { ArrowUpRight, Users, Briefcase, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';

export default function CRMDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-jetbrains text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of your pipeline and lead conversions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value="1,248" 
          change="+12% this month" 
          icon={<Users className="w-5 h-5 text-blue-400" />} 
        />
        <StatCard 
          title="Active Opportunities" 
          value="45" 
          change="8 closing this week" 
          icon={<Briefcase className="w-5 h-5 text-emerald-400" />} 
        />
        <StatCard 
          title="Pipeline Value" 
          value="$124,500" 
          change="+5.2% from last month" 
          icon={<TrendingUp className="w-5 h-5 text-indigo-400" />} 
        />
        <StatCard 
          title="Conversion Rate" 
          value="18.4%" 
          change="+2.1% from last month" 
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-200">New lead <span className="font-medium text-white">John Doe</span> assigned</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
