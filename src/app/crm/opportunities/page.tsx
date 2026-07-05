'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Download, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { PipelineStage, CrmCandidate, CrmCandidateScore, CrmOpportunity } from '@/types';

const STAGE_COLORS = ['bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500'];

export default function OpportunitiesPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [candidates, setCandidates] = useState<CrmCandidate[]>([]); // Added state to store candidates
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    stage_id: '',
    candidate_id: '', // Added candidate_id form state
  });

  // Set default stage when stages load
  useEffect(() => {
    if (stages.length > 0 && !formData.stage_id) {
      setFormData(prev => ({ ...prev, stage_id: stages[0].stage_id }));
    }
  }, [stages]);

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Get current user and their tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to add an opportunity');
      setIsSubmitting(false);
      return;
    }

    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
      
    if (!crmUser?.tenant_id) {
      alert('No tenant associated with your account');
      setIsSubmitting(false);
      return;
    }
    
    const newOpp = {
      name: formData.name,
      amount: Number(formData.amount) || 0,
      stage_id: formData.stage_id,
      candidate_id: formData.candidate_id || null, // Added candidate_id database write
      tenant_id: crmUser.tenant_id,
      owner_id: user.id,
      currency: 'USD',
      expected_value: Number(formData.amount) || 0,
    };

    const { data: insertedData, error } = await supabase
      .from('opportunities')
      .insert([newOpp])
      .select(`
        opportunity_id,
        name,
        stage_id,
        amount,
        currency,
        candidate_id,
        accounts (
          name
        )
      `)
      .single();
    
    setIsSubmitting(false);
    
    if (error) {
      console.error('Error adding opportunity:', error);
      alert('Failed to add opportunity');
    } else if (insertedData) {
      setIsDrawerOpen(false);
      setFormData({ name: '', amount: '', stage_id: stages[0]?.stage_id || '', candidate_id: '' });
      
      const resolvedCandidate = candidates.find(c => c.id === insertedData.candidate_id);
      
      const newOppState: CrmOpportunity = {
        opportunity_id: insertedData.opportunity_id,
        name: insertedData.name,
        stage_id: insertedData.stage_id,
        amount: insertedData.amount,
        currency: insertedData.currency,
        candidate_id: insertedData.candidate_id,
        accounts: Array.isArray(insertedData.accounts) ? insertedData.accounts[0] : (insertedData.accounts || undefined),
        candidate: resolvedCandidate
      };
      
      setOpportunities(prev => [...prev, newOppState]);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const downloadPDF = async (e: React.MouseEvent, studentId: string, type: 'profile' | 'interview-guide') => {
    e.stopPropagation(); // Prevent card click
    try {
      const res = await authFetch(`/api/crm/candidates/${studentId}/pdf/${type}`);
      if (!res.ok) throw new Error(`Failed to generate ${type} PDF`);
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert(`Error downloading ${type} PDF`);
    }
  };

  const { loading, error } = useSupabaseQuery(async () => {
    // Get current user and their tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    const currentTenantId = crmUser?.tenant_id;
    if (!currentTenantId) return;

    // Fetch candidates for actual association and selection dropdown
    let candidatesData: CrmCandidate[] = [];
    try {
      const res = await authFetch('/api/crm/candidates');
      if (res.ok) {
        candidatesData = await res.json();
        setCandidates(candidatesData); // Save to component state
      }
    } catch (e) {
      console.error("Failed to fetch candidates for opportunities view", e);
    }

    // Get stages for this tenant
    const { data: stagesData, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .order('sequence', { ascending: true });

    if (stagesError) throw stagesError;
    setStages(stagesData || []);

    // Get opportunities with account name and candidate_id for this tenant
    const { data: oppsData, error: oppsError } = await supabase
      .from('opportunities')
      .select(`
        opportunity_id,
        name,
        stage_id,
        amount,
        currency,
        candidate_id,
        accounts (
          name
        )
      `)
      .eq('tenant_id', currentTenantId);

    if (oppsError) throw oppsError;
    
    // Map account array to single object and match candidate by candidate_id
    const mappedOpps = (oppsData || []).map((opp: any) => ({
      ...opp,
      accounts: Array.isArray(opp.accounts) ? opp.accounts[0] : opp.accounts,
      candidate: candidatesData.find(c => c.id === opp.candidate_id) // Resolved by ID instead of modulo
    }));
    
    setOpportunities(mappedOpps);
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
          <DataState state="loading" className="h-full" />
        ) : error ? (
          <DataState state="error" message={error instanceof Error ? error.message : String(error)} className="h-full" />
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
                      <div key={opp.opportunity_id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer group flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium text-sm leading-tight group-hover:text-blue-400 transition-colors">{opp.name}</h4>
                          <button className="text-slate-600 hover:text-slate-300 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-400 text-xs mb-3">{opp.accounts?.name || 'Unknown Account'}</p>
                        
                        {/* Psychometric Data Injection */}
                        {opp.candidate && (
                          <div className="mb-3 pt-3 border-t border-slate-800/60">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-400 font-medium">Candidate Match</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Star className="w-3 h-3" />
                                {opp.candidate.archetype || 'N/A'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                               {['IQ', 'EQ', 'AQ', 'SQ', 'SpQ'].map(dim => {
                                 const val = opp.candidate!.scores?.[dim as keyof CrmCandidateScore];
                                 if (val === undefined) return null;
                                 const isGap = val < 70;
                                 return (
                                   <div key={dim} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${isGap ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'}`}>
                                     {dim}:{val}
                                   </div>
                                 );
                                })}
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => downloadPDF(e, opp.candidate!.id, 'profile')}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-[10px] font-medium"
                              >
                                <Download className="w-3 h-3" /> Profile
                              </button>
                              <button 
                                onClick={(e) => downloadPDF(e, opp.candidate!.id, 'interview-guide')}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/30 transition-colors text-[10px] font-medium"
                              >
                                <Download className="w-3 h-3" /> Guide
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-auto pt-2">
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
        <form onSubmit={handleAddOpportunity} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Enterprise License Deal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
            <select 
              required
              value={formData.stage_id}
              onChange={e => setFormData({...formData, stage_id: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {stages.map(stage => (
                <option key={stage.stage_id} value={stage.stage_id}>{stage.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
            <input 
              type="number"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 50000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Associate Candidate (Optional)</label>
            <select 
              value={formData.candidate_id}
              onChange={e => setFormData({...formData, candidate_id: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Candidate --</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name} ({candidate.archetype})
                </option>
              ))}
            </select>
          </div>
          
          <div className="pt-4 border-t border-gray-200 mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Opportunity'}
            </button>
          </div>
        </form>
      </SlideOutDrawer>
    </div>
  );
}
