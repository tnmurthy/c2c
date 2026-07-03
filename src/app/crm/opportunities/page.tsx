'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';

interface PipelineStage {
  stage_id: string;
  name: string;
  sequence: number;
}

interface Opportunity {
  opportunity_id: string;
  name: string;
  stage_id: string;
  amount: number;
  currency: string;
  accounts?: {
    name: string;
  };
}

const STAGE_COLORS = ['bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500'];

export default function OpportunitiesPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get stages
        const { data: stagesData, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('*')
          .order('sequence', { ascending: true });

        if (stagesError) throw stagesError;
        setStages(stagesData || []);

        // Get opportunities with account name
        const { data: oppsData, error: oppsError } = await supabase
          .from('opportunities')
          .select(`
            opportunity_id,
            name,
            stage_id,
            amount,
            currency,
            accounts (
              name
            )
          `);

        if (oppsError) throw oppsError;
        
        // Map account array to single object if Supabase returns array for 1:N relations
        const mappedOpps = (oppsData || []).map((opp: any) => ({
          ...opp,
          accounts: Array.isArray(opp.accounts) ? opp.accounts[0] : opp.accounts
        }));
        
        setOpportunities(mappedOpps);
      } catch (error) {
        console.error('Error fetching opportunities data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Opportunities</h2>
          <p className="text-slate-400 mt-1">Manage deals across your pipeline stages.</p>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shrink-0">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search opportunities..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex space-x-3">
          <select className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
            <option>All Pipelines</option>
            <option>B2B Partnerships</option>
            <option>Admissions</option>
          </select>
          <button className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-950 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pt-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
             <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex space-x-4 h-full min-w-max pb-4">
            {stages.map((stage, index) => {
              const stageOpps = opportunities.filter(opp => opp.stage_id === stage.stage_id);
              const stageTotal = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
              const color = STAGE_COLORS[index % STAGE_COLORS.length];
              
              return (
                <div key={stage.stage_id} className="w-80 flex flex-col h-full bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
                  {/* Stage Header */}
                  <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <h3 className="font-medium text-white">{stage.name}</h3>
                      <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{stageOpps.length}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-400">{formatCurrency(stageTotal, 'USD')}</div>
                  </div>

                  {/* Stage Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageOpps.map(opp => (
                      <div key={opp.opportunity_id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium text-sm leading-tight group-hover:text-blue-400 transition-colors">{opp.name}</h4>
                          <button className="text-slate-600 hover:text-slate-300 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-400 text-xs mb-3">{opp.accounts?.name || 'Unknown Account'}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-emerald-400 font-medium text-sm">{formatCurrency(opp.amount, opp.currency)}</span>
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300" title="Assigned">
                            OP
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty State for columns with no items */}
                    {stageOpps.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-sm">
                        No deals
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlideOutDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add New Opportunity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Opportunity Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Enterprise License Deal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Amount</label>
            <input 
              type="number" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. 50000"
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Save Opportunity
            </button>
          </div>
        </div>
      </SlideOutDrawer>
    </div>
  );
}
