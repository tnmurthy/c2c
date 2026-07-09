'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Mail, Phone, User, Calendar, Edit3, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { useAuthSession } from '@/hooks/useAuthSession';

interface Lead {
  lead_id: string;
  tenant_id: string;
  owner_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, tenantId, loading: authLoading } = useAuthSession();
  const userId = user?.id || null;

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    notes: ''
  });

  // Fetch leads filtered by current tenant
  const { data: leads = [], loading: queryLoading, error, refetch: fetchLeads } = useSupabaseQuery<Lead[]>(async () => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }, [tenantId]);

  const loading = queryLoading || authLoading;

  // Handle outside click for status dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownLeadId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddOrEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!tenantId) {
      alert('Error: Tenant info not loaded yet.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      tenant_id: tenantId,
      owner_id: userId || undefined
    };

    try {
      if (editingLeadId) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update(payload)
          .eq('lead_id', editingLeadId);
        
        if (error) throw error;
      } else {
        // Create new lead
        const { error } = await supabase
          .from('leads')
          .insert([payload]);
          
        if (error) throw error;
      }

      setIsAddDrawerOpen(false);
      setEditingLeadId(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        source: 'website',
        status: 'new',
        notes: ''
      });
      fetchLeads();
    } catch (err: any) {
      console.error('Error saving lead:', err);
      alert(err.message || 'Failed to save lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLeadId(lead.lead_id);
    setFormData({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'website',
      status: lead.status || 'new',
      notes: lead.notes || ''
    });
    setIsAddDrawerOpen(true);
  };

  const handleConvertLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to convert this lead? This will create an Account and a Contact.')) return;
    try {
      const res = await authFetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ account_type: 'company' })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to convert lead');
      }
      
      alert('Lead successfully converted to Contact & Account!');
      fetchLeads();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error converting lead');
    }
  };

  const updateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('lead_id', leadId);
        
      if (error) throw error;
      fetchLeads();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status');
    } finally {
      setActiveDropdownLeadId(null);
    }
  };

  const filteredLeads = (leads || []).filter(lead => 
    `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'qualified':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'converted':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'closed':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Leads</h2>
          <p className="text-slate-400 mt-1">Manage and track your incoming inquiries.</p>
        </div>
        <button 
          onClick={() => {
            setEditingLeadId(null);
            setFormData({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              source: 'website',
              status: 'new',
              notes: ''
            });
            setIsAddDrawerOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search leads by name or email..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <DataState state="loading" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <DataState state="error" message={error instanceof Error ? error.message : String(error)} />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <DataState state="empty" message="No leads found." />
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.lead_id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700/50">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{lead.first_name} {lead.last_name}</div>
                          {lead.phone && (
                            <div className="text-xs text-slate-500 flex items-center mt-0.5">
                              <Phone className="w-3 h-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {lead.email ? (
                        <div className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          {lead.email}
                        </div>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300 capitalize">{lead.source || 'N/A'}</td>
                    <td className="px-6 py-4 overflow-visible relative">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveDropdownLeadId(activeDropdownLeadId === lead.lead_id ? null : lead.lead_id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize flex items-center space-x-1.5 transition-colors focus:outline-none ${getStatusBadgeClass(lead.status)}`}
                        >
                          <span>{lead.status}</span>
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        
                        {activeDropdownLeadId === lead.lead_id && (
                          <div 
                            ref={dropdownRef}
                            className="absolute z-50 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 text-slate-200 left-0"
                          >
                            {['new', 'qualified', 'converted', 'closed'].map((statusOption) => (
                              <button
                                key={statusOption}
                                onClick={() => updateStatus(lead.lead_id, statusOption)}
                                className={`w-full text-left px-3 py-1.5 text-xs capitalize hover:bg-slate-800 transition-colors ${
                                  lead.status === statusOption ? 'text-blue-400 font-semibold' : 'text-slate-300'
                                }`}
                              >
                                {statusOption}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenEdit(lead)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {lead.status !== 'converted' && (
                          <button 
                            onClick={() => handleConvertLead(lead.lead_id)}
                            className="p-1.5 hover:bg-emerald-950/40 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Convert to Contact"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Lead Drawer */}
      <SlideOutDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => {
          setIsAddDrawerOpen(false);
          setEditingLeadId(null);
        }} 
        title={editingLeadId ? "Edit Lead Details" : "Add New Lead"}
      >
        <form onSubmit={handleAddOrEditLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">First Name *</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.first_name}
                onChange={e => setFormData({...formData, first_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Name *</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.last_name}
                onChange={e => setFormData({...formData, last_name: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email *</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
            <input 
              type="text" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Source</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="event">Event</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
            <textarea 
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsAddDrawerOpen(false);
                setEditingLeadId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingLeadId ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </SlideOutDrawer>
    </div>
  );
}
