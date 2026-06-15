"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, AlertTriangle, PieChart, Activity, Loader2, AlertCircle } from "lucide-react";

export default function TPODashboard() {
  const { id } = useParams();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cohort/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch cohort data");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        // Fallback mock data
        setData({
          averages: { IQ: 70, EQ: 80, SQ: 60, AQ: 75, SpQ: 65 },
          founder_distribution: { Builder: 40, Leader: 30, Rainmaker: 20, Anchor: 10 },
          support_needs: [
            "Cohort average AQ is below 50. Consider implementing resilience and stress-management workshops.",
            "Cohort average IQ is below 50. Evaluate if core curriculum needs reinforcement."
          ]
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        <AlertCircle className="mr-2 h-6 w-6" />
        <span>{error}</span>
      </div>
    );
  }

  const averages = data?.averages || {};
  const distribution = data?.founder_distribution || {};
  const supportNeeds = data?.support_needs || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900 dark:text-white">
            <Users className="h-8 w-8 text-purple-600" />
            TPO Cohort Dashboard
          </h1>
          <p className="mt-2 text-slate-500">Intelligence, Profiles, and Risk Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Cohort Intelligence Heatmap */}
        <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cohort Intelligence Heatmap</h2>
          </div>
          
          <div className="space-y-6">
            {Object.entries(averages).map(([key, value]) => {
              const numValue = Number(value) || 0;
              return (
                <div key={key}>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{key}</span>
                    <span className="text-slate-900 dark:text-white">{numValue.toFixed(1)}</span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className={`h-full ${numValue > 75 ? 'bg-green-500' : numValue > 50 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                      style={{ width: `${numValue}%` }} 
                    />
                  </div>
                </div>
              )
            })}
            {Object.keys(averages).length === 0 && (
               <p className="text-sm italic text-slate-500">No data available yet.</p>
            )}
          </div>
        </div>

        {/* Founder Profile Distribution */}
        <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <PieChart className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Founder Profile Distribution</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(distribution).map(([key, value]) => {
              const numValue = Number(value) || 0;
              return (
                <div key={key} className="rounded-2xl border border-slate-100 p-6 text-center dark:border-slate-800">
                  <div className="text-3xl font-black text-purple-600">{numValue.toFixed(0)}%</div>
                  <div className="mt-2 text-sm font-bold uppercase tracking-wider text-slate-500">{key}</div>
                </div>
              )
            })}
            {Object.keys(distribution).length === 0 && (
               <p className="col-span-2 text-sm italic text-slate-500">No distribution data available yet.</p>
            )}
          </div>
        </div>

        {/* Risk & Support Needs */}
        <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Risk & Support Needs</h2>
          </div>

          {supportNeeds.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {supportNeeds.map((need: string, idx: number) => (
                <li key={idx} className="flex rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                  <AlertCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <span className="text-sm leading-relaxed text-red-900 dark:text-red-200">{need}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <p className="text-slate-500">No significant risks or support needs identified for this cohort.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
