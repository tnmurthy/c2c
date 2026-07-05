'use client';

import React, { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Building2, MapPin, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { CrmAccount } from '@/types';

export default function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'college',
    industry: '',
    city: '',
    website: ''
  });

  const { data: accounts = [], loading, error, refetch: fetchAccounts } = useSupabaseQuery<CrmAccount[]>(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Fetch a tenant id and user id to attach (for demo purposes)
    const { data: tenantData } = await supabase.from('tenants').select('tenant_id').limit(1).single();
    const { data: userData } = await supabase.from('crm_users').select('user_id').limit(1).single();
    
    const newAccount = {
      ...formData,
      tenant_id: tenantData?.tenant_id || '3ee2a6e1-77b7-492e-95dd-dda9ab189d56',
      owner_id: userData?.user_id || 'd277d663-9f88-4201-a94f-3fee1ff87bce'
    };

    const { error } = await supabase.from('accounts').insert([newAccount]);
    
    setIsSubmitting(false);
    
    if (error) {
      console.error('Error adding account:', error);
      alert('Failed to add account');
    } else {
      setIsAddDrawerOpen(false);
      setFormData({ name: '', type: 'college', industry: '', city: '', website: '' });
      fetchAccounts();
    }
  };

  const filteredAccounts = (accounts || []).filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Accounts</h2>
          <p className="text-slate-400 mt-1">Manage Universities, Colleges, and Employer partners.</p>
        </div>
        <button 
          onClick={() => setIsAddDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search accounts..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-3">
          <select className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="">All Types</option>
            <option value="university">Universities</option>
            <option value="college">Colleges</option>
            <option value="company">Employers</option>
          </select>
          <button className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-950 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
              <th className="px-6 py-4 font-medium">Account Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Location & Web</th>
              <th className="px-6 py-4 font-medium">Owner</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <DataState state="loading" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <DataState state="error" message={error instanceof Error ? error.message : String(error)} />
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <DataState state="empty" message="No accounts found." />
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.account_id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{account.name}</div>
                        <div className="text-xs text-slate-500">{account.industry || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      account.type === 'company' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-slate-300">
                        <MapPin className="w-3 h-3 mr-2 text-slate-500" />
                        {account.city || 'Unknown'}
                      </div>
                      {account.website && (
                        <div className="flex items-center text-slate-300">
                          <Globe className="w-3 h-3 mr-2 text-slate-500" />
                          {account.website}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400" title={account.owner_id}>
                      {account.owner_id ? account.owner_id.substring(0, 8) + '...' : 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-500 hover:text-white transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Account Drawer */}
      <SlideOutDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => setIsAddDrawerOpen(false)} 
        title="Add New Account"
      >
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
            <input 
              type="text" 
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select 
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="college">College</option>
              <option value="university">University</option>
              <option value="company">Employer (Company)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input 
              type="text" 
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.industry}
              onChange={e => setFormData({...formData, industry: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input 
              type="text" 
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.city}
              onChange={e => setFormData({...formData, city: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input 
              type="url" 
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.website}
              onChange={e => setFormData({...formData, website: e.target.value})}
            />
          </div>
          
          <div className="pt-4 border-t border-gray-200 mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </SlideOutDrawer>
    </div>
  );
}
