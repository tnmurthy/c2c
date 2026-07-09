'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, User, Building2, Linkedin, Briefcase, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { useAuthSession } from '@/hooks/useAuthSession';

interface Account {
  account_id: string;
  name: string;
}

interface Contact {
  contact_id: string;
  tenant_id: string;
  account_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  owner_id?: string;
  city?: string;
  country?: string;
  created_at: string;
  accounts?: {
    name: string;
  };
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  
  const { user, tenantId, loading: authLoading } = useAuthSession();
  const userId = user?.id || null;
  
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    account_id: '',
    city: '',
    country: ''
  });

  // Fetch accounts list for dropdown
  useEffect(() => {
    if (!tenantId) return;
    async function fetchAccounts() {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id, name')
        .eq('tenant_id', tenantId)
        .order('name');
      if (!error && data) {
        setAccounts(data);
      }
    }
    fetchAccounts();
  }, [tenantId]);

  // Fetch contacts for this tenant
  const { data: contacts = [], loading: queryLoading, error, refetch: fetchContacts } = useSupabaseQuery<Contact[]>(async () => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('*, accounts(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }, [tenantId]);

  const loading = queryLoading || authLoading;

  const handleAddOrEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!tenantId) {
      alert('Error: Tenant info not loaded yet.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role || undefined,
      account_id: formData.account_id || null,
      city: formData.city || undefined,
      country: formData.country || undefined,
      tenant_id: tenantId,
      owner_id: userId || undefined
    };

    try {
      if (editingContactId) {
        // Update contact
        const { error } = await supabase
          .from('contacts')
          .update(payload)
          .eq('contact_id', editingContactId);
        if (error) throw error;
      } else {
        // Create contact
        const { error } = await supabase
          .from('contacts')
          .insert([payload]);
        if (error) throw error;
      }

      setIsDrawerOpen(false);
      setEditingContactId(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        account_id: '',
        city: '',
        country: ''
      });
      fetchContacts();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      alert(err.message || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContactId(contact.contact_id);
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      account_id: contact.account_id || '',
      city: contact.city || '',
      country: contact.country || ''
    });
    setIsDrawerOpen(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('contact_id', contactId);
      if (error) throw error;
      fetchContacts();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      alert(err.message || 'Failed to delete contact');
    }
  };

  const filteredContacts = (contacts || []).filter(c => 
    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Contacts</h2>
          <p className="text-slate-400 mt-1">Manage and link key stakeholder profiles.</p>
        </div>
        <button 
          onClick={() => {
            setEditingContactId(null);
            setFormData({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              role: '',
              account_id: '',
              city: '',
              country: ''
            });
            setIsDrawerOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search contacts..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Account</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">LinkedIn</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <DataState state="loading" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <DataState state="error" message={error instanceof Error ? error.message : String(error)} />
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <DataState state="empty" message="No contacts found." />
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.contact_id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700/50">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="font-medium text-white">{contact.first_name} {contact.last_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contact.accounts?.name ? (
                        <div className="flex items-center text-slate-300">
                          <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          {contact.accounts.name}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.role ? (
                        <div className="flex items-center text-slate-300">
                          <Briefcase className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          <span className="capitalize">{contact.role}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="flex items-center hover:text-blue-400 transition-colors">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {contact.phone ? (
                        <div className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://linkedin.com/in/${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors"
                        title="LinkedIn Search"
                      >
                        <Linkedin className="w-4 h-4 text-blue-500 mr-1.5" />
                        <span className="text-xs">Profile</span>
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenEdit(contact)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                          title="Edit Contact"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact.contact_id)}
                          className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Contact Drawer */}
      <SlideOutDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingContactId(null);
        }} 
        title={editingContactId ? "Edit Contact" : "Add New Contact"}
      >
        <form onSubmit={handleAddOrEditContact} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Role / Job Title</label>
              <input 
                type="text" 
                placeholder="e.g. Placement Officer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Linked Account</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.account_id}
                onChange={e => setFormData({...formData, account_id: e.target.value})}
              >
                <option value="">No Account</option>
                {accounts.map(acc => (
                  <option key={acc.account_id} value={acc.account_id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">City</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Country</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.country}
                onChange={e => setFormData({...formData, country: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">LinkedIn URL</label>
            <input 
              type="url" 
              placeholder="https://linkedin.com/in/username"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              // Storing in UI and generating search URL or search layout. We handle this client-side.
            />
          </div>

          <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingContactId(null);
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
              {isSubmitting ? 'Saving...' : editingContactId ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </SlideOutDrawer>
    </div>
  );
}
