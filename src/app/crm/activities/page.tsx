'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Calendar, Phone, Video, FileText, CheckCircle, Clock, Trash2, Link as LinkIcon, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SlideOutDrawer from '@/components/crm/SlideOutDrawer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { useAuthSession } from '@/hooks/useAuthSession';

interface Activity {
  activity_id: string;
  tenant_id: string;
  owner_id?: string;
  type: string; // Call, Task, Meeting, Note
  subject: string; // Title
  description?: string; // Notes
  due_date?: string;
  completed_at?: string;
  status: string; // open, completed
  related_entity_type?: string; // lead, opportunity
  related_entity_id?: string;
  created_at: string;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function ActivitiesPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, tenantId, loading: authLoading } = useAuthSession();
  const userId = user?.id || null;
  
  // Lookups for linked entities
  const [leads, setLeads] = useState<DropdownItem[]>([]);
  const [opportunities, setOpportunities] = useState<DropdownItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'Task',
    subject: '',
    description: '',
    due_date: '',
    related_entity_type: '', // '', 'lead', 'opportunity'
    related_entity_id: ''
  });

  // Fetch leads and opportunities for dropdown and lookups
  useEffect(() => {
    if (!tenantId) return;
    async function loadEntities() {
      // Load leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('lead_id, first_name, last_name')
        .eq('tenant_id', tenantId);
      if (leadsData) {
        setLeads(leadsData.map(l => ({
          id: l.lead_id,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unnamed Lead'
        })));
      }

      // Load opportunities
      const { data: oppsData } = await supabase
        .from('opportunities')
        .select('opportunity_id, name')
        .eq('tenant_id', tenantId);
      if (oppsData) {
        setOpportunities(oppsData.map(o => ({
          id: o.opportunity_id,
          name: o.name
        })));
      }
    }
    loadEntities();
  }, [tenantId]);

  // Fetch activities
  const { data: activities = [], loading: queryLoading, error, refetch: fetchActivities } = useSupabaseQuery<Activity[]>(async () => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true });
      
    if (error) throw error;
    return data || [];
  }, [tenantId]);

  const loading = queryLoading || authLoading;

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!tenantId) {
      alert('Error: Tenant info not loaded yet.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      owner_id: userId || undefined,
      type: formData.type,
      subject: formData.subject,
      description: formData.description || undefined,
      due_date: formData.due_date || undefined,
      status: 'open',
      related_entity_type: formData.related_entity_type || null,
      related_entity_id: formData.related_entity_id || null
    };

    try {
      const { error } = await supabase
        .from('activities')
        .insert([payload]);
        
      if (error) throw error;

      setIsDrawerOpen(false);
      setFormData({
        type: 'Task',
        subject: '',
        description: '',
        due_date: '',
        related_entity_type: '',
        related_entity_id: ''
      });
      fetchActivities();
    } catch (err: any) {
      console.error('Error creating activity:', err);
      alert(err.message || 'Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (activityId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'completed' : 'open';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('activity_id', activityId);

      if (error) throw error;
      fetchActivities();
    } catch (err: any) {
      console.error('Error transitioning activity status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('activity_id', activityId);

      if (error) throw error;
      fetchActivities();
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      alert(err.message || 'Failed to delete activity');
    }
  };

  const isOverdue = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr || status?.toLowerCase() !== 'open') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Helper to resolve linked entity name
  const getLinkedEntityName = (type?: string, id?: string) => {
    if (!type || !id) return null;
    if (type === 'lead') {
      const found = leads.find(l => l.id === id);
      return found ? `Lead: ${found.name}` : 'Linked Lead';
    }
    if (type === 'opportunity') {
      const found = opportunities.find(o => o.id === id);
      return found ? `Opportunity: ${found.name}` : 'Linked Opportunity';
    }
    return null;
  };

  // Helper to get type icon and style
  const getTypeStyling = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'call':
        return {
          icon: <Phone className="w-4 h-4 text-sky-400" />,
          badgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
        };
      case 'meeting':
        return {
          icon: <Video className="w-4 h-4 text-purple-400" />,
          badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        };
      case 'note':
        return {
          icon: <FileText className="w-4 h-4 text-slate-400" />,
          badgeClass: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
        };
      case 'task':
      default:
        return {
          icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
          badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        };
    }
  };

  // Split activities into open and completed
  const openActivities = (activities || []).filter(a => a.status === 'open');
  const completedActivities = (activities || []).filter(a => a.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Activities</h2>
          <p className="text-slate-400 mt-1">Schedule and monitor your calls, meetings, and pipeline tasks.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              type: 'Task',
              subject: '',
              description: '',
              due_date: new Date().toISOString().split('T')[0],
              related_entity_type: '',
              related_entity_id: ''
            });
            setIsDrawerOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          <Plus className="w-4 h-4" />
          <span>New Activity</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <DataState state="loading" />
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <DataState state="error" message={error instanceof Error ? error.message : String(error)} />
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <DataState state="empty" message="No activities scheduled yet." />
        </div>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* TO DO COLUMN */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-white">To Do</h3>
              </div>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
                {openActivities.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[600px] pr-1">
              {openActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">All caught up! No pending tasks.</div>
              ) : (
                openActivities.map(activity => {
                  const typeStyle = getTypeStyling(activity.type);
                  const overdue = isOverdue(activity.due_date, activity.status);
                  const linkedName = getLinkedEntityName(activity.related_entity_type, activity.related_entity_id);

                  return (
                    <div 
                      key={activity.activity_id}
                      className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-all hover:border-slate-700/80 ${
                        overdue ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-slate-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xxs font-semibold capitalize flex items-center space-x-1 ${typeStyle.badgeClass}`}>
                            {typeStyle.icon}
                            <span className="ml-1">{activity.type}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button 
                            onClick={() => handleToggleStatus(activity.activity_id, activity.status)}
                            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50 rounded transition-colors"
                            title="Complete Activity"
                          >
                            <CheckCircle className="w-4.5 h-4.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteActivity(activity.activity_id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-100">{activity.subject}</h4>
                        {activity.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-3 whitespace-pre-wrap">{activity.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40 text-xs">
                        <div className="flex items-center space-x-1">
                          <Calendar className={`w-3.5 h-3.5 ${overdue ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
                          <span className={`${overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                            {activity.due_date ? new Date(activity.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Due Date'}
                            {overdue && <span className="ml-1 text-xxs bg-red-500/10 border border-red-500/20 px-1 py-0.2 rounded font-mono">OVERDUE</span>}
                          </span>
                        </div>

                        {linkedName && (
                          <div className="flex items-center text-slate-500 space-x-1 text-xxs bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full max-w-[200px] truncate" title={linkedName}>
                            <LinkIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{linkedName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COMPLETED COLUMN */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-white">Completed</h3>
              </div>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
                {completedActivities.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[600px] pr-1">
              {completedActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No activities completed yet.</div>
              ) : (
                completedActivities.map(activity => {
                  const typeStyle = getTypeStyling(activity.type);
                  const linkedName = getLinkedEntityName(activity.related_entity_type, activity.related_entity_id);

                  return (
                    <div 
                      key={activity.activity_id}
                      className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 space-y-3 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded text-xxs font-semibold capitalize flex items-center space-x-1 ${typeStyle.badgeClass}`}>
                          {typeStyle.icon}
                          <span className="ml-1">{activity.type}</span>
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button 
                            onClick={() => handleToggleStatus(activity.activity_id, activity.status)}
                            className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800/50 rounded transition-colors"
                            title="Reopen Activity"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteActivity(activity.activity_id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-400 line-through">{activity.subject}</h4>
                        {activity.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-wrap">{activity.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/20 text-xs">
                        <div className="text-slate-500 text-xxs">
                          Completed: {activity.completed_at ? new Date(activity.completed_at).toLocaleDateString() : 'N/A'}
                        </div>

                        {linkedName && (
                          <div className="flex items-center text-slate-600 space-x-1 text-xxs bg-slate-950/50 border border-slate-800/40 px-2 py-0.5 rounded-full max-w-[200px] truncate" title={linkedName}>
                            <LinkIcon className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="truncate">{linkedName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Add Activity Drawer */}
      <SlideOutDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title="Schedule New Activity"
      >
        <form onSubmit={handleAddActivity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Activity Type *</label>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="Task">Task</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Note">Note</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject / Title *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Follow up on proposal"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.due_date}
              onChange={e => setFormData({...formData, due_date: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Link Entity Type</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.related_entity_type}
                onChange={e => setFormData({...formData, related_entity_type: e.target.value, related_entity_id: ''})}
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>

            {formData.related_entity_type && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Linked Record</label>
                <select 
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.related_entity_id}
                  onChange={e => setFormData({...formData, related_entity_id: e.target.value})}
                >
                  <option value="">Select...</option>
                  {formData.related_entity_type === 'lead' 
                    ? leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                    : opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)
                  }
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes / Description</label>
            <textarea 
              rows={4}
              placeholder="Provide notes or task instructions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Create Activity'}
            </button>
          </div>
        </form>
      </SlideOutDrawer>
    </div>
  );
}
