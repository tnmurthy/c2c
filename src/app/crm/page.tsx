'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Users, Briefcase, TrendingUp, CheckCircle, DollarSign, Activity } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import { useAuthSession } from '@/hooks/useAuthSession';

interface FunnelData {
  leads: number;
  contacts: number;
  opportunities_total: number;
  opportunities_interview: number;
  opportunities_closed_won: number;
  conversion_rates: {
    lead_to_contact: number;
    contact_to_opportunity: number;
    opportunity_to_interview: number;
    interview_to_closed_won: number;
  };
}

interface SummaryData {
  total_revenue: number;
  total_leads: number;
  pipeline_value: number;
  win_rate: number;
  avg_opportunity_value: number;
  leads_count: number;
  contacts_count: number;
  won_deals_count: number;
  leads_change: number;
  contacts_change: number;
  deals_change: number;
}

export default function CRMDashboard() {
  const { user, tenantId, loading: authLoading } = useAuthSession();
  const [dataLoading, setDataLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<any | null>(null);
  const [hoveredFunnelStage, setHoveredFunnelStage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!tenantId) {
      setDataLoading(false);
      return;
    }

    async function loadDashboardData() {
      try {
        setDataLoading(true);

        // Fetch metrics from backend
        const [summaryRes, funnelRes] = await Promise.all([
          authFetch('/api/analytics/summary'),
          authFetch('/api/analytics/funnel')
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData);
        }

        if (funnelRes.ok) {
          const funnelData = await funnelRes.json();
          setFunnel(funnelData);
        }

        // Fetch opportunities for trend chart
        const { data: oppsData } = await supabase
          .from('opportunities')
          .select('created_at, amount')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true });
        
        if (oppsData) {
          setOpportunities(oppsData);
        }

        // Fetch recent leads for activities feed
        const { data: leadsData } = await supabase
          .from('leads')
          .select('first_name, last_name, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (leadsData) {
          setRecentLeads(leadsData);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadDashboardData();
  }, [authLoading, tenantId]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-slate-400 font-mono text-sm">Loading CRM Analytics...</p>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex h-64 items-center justify-center p-6 bg-slate-900/30 border border-slate-800 rounded-xl">
        <div className="text-center">
          <h2 className="text-xl font-medium text-white mb-2">No Tenant Associated</h2>
          <p className="text-slate-400">Your account is not linked to any CRM tenant. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Process opportunity data for trend chart
  const getTrendData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create last 6 months buckets
    const last6Months: { month: string; year: number; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        value: 0
      });
    }

    // Populate data
    opportunities.forEach(opp => {
      const oppDate = new Date(opp.created_at);
      const oppMonthName = monthNames[oppDate.getMonth()];
      const oppYear = oppDate.getFullYear();
      const amount = Number(opp.amount) || 0;

      const monthObj = last6Months.find(m => m.month === oppMonthName && m.year === oppYear);
      if (monthObj) {
        monthObj.value += amount;
      }
    });

    // Compute cumulative sum for pipeline growth
    let cumulativeSum = 0;
    return last6Months.map(m => {
      cumulativeSum += m.value;
      return {
        label: m.month,
        value: cumulativeSum
      };
    });
  };

  const trendData = getTrendData();
  const maxTrendVal = Math.max(...trendData.map(d => d.value), 1000);

  // SVG dimensions for Trend Chart
  const trendWidth = 500;
  const trendHeight = 220;
  const trendPaddingLeft = 55;
  const trendPaddingRight = 20;
  const trendPaddingTop = 20;
  const trendPaddingBottom = 30;

  const trendChartWidth = trendWidth - trendPaddingLeft - trendPaddingRight;
  const trendChartHeight = trendHeight - trendPaddingTop - trendPaddingBottom;

  // Map trend points to coordinates
  const trendPoints = trendData.map((d, i) => {
    const x = trendPaddingLeft + (i * (trendChartWidth / (trendData.length - 1)));
    const y = trendPaddingTop + (trendChartHeight - (d.value / maxTrendVal) * trendChartHeight);
    return { x, y, ...d };
  });

  // Construct SVG Area & Line path strings
  let trendLinePath = '';
  let trendAreaPath = '';

  if (trendPoints.length > 0) {
    trendLinePath = `M ${trendPoints[0].x} ${trendPoints[0].y} ` + 
      trendPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

    trendAreaPath = `${trendLinePath} L ${trendPoints[trendPoints.length - 1].x} ${trendHeight - trendPaddingBottom} L ${trendPoints[0].x} ${trendHeight - trendPaddingBottom} Z`;
  }

  // Funnel chart calculations
  const funnelStages = [
    { name: 'Leads', count: funnel?.leads || 0, colorStart: '#06b6d4', colorEnd: '#3b82f6', rateLabel: 'Lead to Contact', rate: funnel?.conversion_rates.lead_to_contact || 0 },
    { name: 'Contacts', count: funnel?.contacts || 0, colorStart: '#3b82f6', colorEnd: '#6366f1', rateLabel: 'Contact to Opportunity', rate: funnel?.conversion_rates.contact_to_opportunity || 0 },
    { name: 'Opportunities', count: funnel?.opportunities_total || 0, colorStart: '#6366f1', colorEnd: '#a855f7', rateLabel: 'Opportunity to Interview', rate: funnel?.conversion_rates.opportunity_to_interview || 0 },
    { name: 'Interviews', count: funnel?.opportunities_interview || 0, colorStart: '#a855f7', colorEnd: '#ec4899', rateLabel: 'Interview to Won', rate: funnel?.conversion_rates.interview_to_closed_won || 0 },
    { name: 'Closed Won', count: funnel?.opportunities_closed_won || 0, colorStart: '#ec4899', colorEnd: '#f43f5e', rateLabel: '', rate: 0 }
  ];

  const maxFunnelCount = Math.max(...funnelStages.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-jetbrains text-white">CRM Dashboard</h2>
        <p className="text-slate-400 mt-1">Real-time funnel conversion metrics and pipeline value.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value={summary?.total_leads || 0} 
          icon={Users} 
          theme="cyan"
          loading={!summary}
        />
        <StatCard 
          title="Pipeline Value" 
          value={formatCurrency(summary?.pipeline_value || 0)} 
          icon={TrendingUp} 
          theme="purple"
          loading={!summary}
        />
        <StatCard 
          title="Win Rate" 
          value={`${summary?.win_rate || 0}%`} 
          icon={CheckCircle} 
          theme="emerald"
          loading={!summary}
        />
        <StatCard 
          title="Avg Deal Size" 
          value={formatCurrency(summary?.avg_opportunity_value || 0)} 
          icon={DollarSign} 
          theme="amber"
          loading={!summary}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* SVG Conversion Funnel Chart */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          <h3 className="text-lg font-medium text-white mb-6 font-jetbrains flex items-center">
            <Activity className="w-5 h-5 mr-2 text-cyan-400" /> Conversion Funnel
          </h3>
          
          <div className="relative">
            <svg viewBox="0 0 520 320" className="w-full h-auto">
              <defs>
                {funnelStages.map((stage, idx) => (
                  <linearGradient id={`funnel-grad-${idx}`} key={idx} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={stage.colorStart} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={stage.colorEnd} stopOpacity="0.85" />
                  </linearGradient>
                ))}
                <filter id="neon-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#3b82f6" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Draw stages */}
              {funnelStages.map((stage, idx) => {
                const y = 15 + idx * 60;
                // Bar width relative to leads count (capped between 40px and 280px)
                const ratio = stage.count / maxFunnelCount;
                const barWidth = 60 + ratio * 240;
                const barX = 250 - barWidth / 2;

                return (
                  <g 
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredFunnelStage(stage.name)}
                    onMouseLeave={() => setHoveredFunnelStage(null)}
                  >
                    {/* Stage Label (Left) */}
                    <text x="20" y={y + 16} fill="#94a3b8" className="text-xs font-semibold font-mono select-none">
                      {stage.name}
                    </text>

                    {/* Funnel Bar Backdrop */}
                    <rect 
                      x="100" 
                      y={y} 
                      width="300" 
                      height="24" 
                      rx="6" 
                      fill="#1e293b" 
                      fillOpacity="0.3"
                    />

                    {/* Funnel Bar */}
                    <rect 
                      x={barX} 
                      y={y} 
                      width={barWidth} 
                      height="24" 
                      rx="6" 
                      fill={`url(#funnel-grad-${idx})`}
                      className="transition-all duration-500 ease-out hover:brightness-110"
                      filter={hoveredFunnelStage === stage.name ? 'url(#neon-glow)' : undefined}
                    />

                    {/* Stage Count (Right) */}
                    <text x="490" y={y + 16} textAnchor="end" fill="#f8fafc" className="text-xs font-bold font-mono select-none">
                      {stage.count}
                    </text>

                    {/* Connecting Arrows & Rate Badges */}
                    {idx < funnelStages.length - 1 && (
                      <g>
                        {/* Connecting dashed line */}
                        <line 
                          x1="250" 
                          y1={y + 24} 
                          x2="250" 
                          y2={y + 60} 
                          stroke="#475569" 
                          strokeWidth="1.5" 
                          strokeDasharray="4 4" 
                        />
                        {/* Rate Badge Box */}
                        <rect 
                          x="222" 
                          y={y + 30} 
                          width="56" 
                          height="18" 
                          rx="4" 
                          fill="#0f172a" 
                          stroke="#334155" 
                          strokeWidth="1"
                        />
                        {/* Rate Badge Percentage */}
                        <text 
                          x="250" 
                          y={y + 42} 
                          textAnchor="middle" 
                          fill={stage.rate > 0 ? '#10b981' : '#94a3b8'} 
                          className="text-[10px] font-bold font-mono select-none"
                        >
                          {stage.rate.toFixed(1)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Custom Funnel Tooltip */}
            {hoveredFunnelStage && (
              <div 
                className="absolute top-2 right-2 bg-slate-950/95 border border-slate-800 rounded-lg p-3 text-xs font-mono shadow-xl backdrop-blur-md z-10 space-y-1 transition-opacity duration-150 animate-in fade-in"
              >
                <p className="text-white font-bold">{hoveredFunnelStage}</p>
                {funnelStages.find(s => s.name === hoveredFunnelStage)?.rateLabel && (
                  <p className="text-slate-400">
                    {funnelStages.find(s => s.name === hoveredFunnelStage)?.rateLabel}:{' '}
                    <span className="text-emerald-400 font-semibold">
                      {funnelStages.find(s => s.name === hoveredFunnelStage)?.rate.toFixed(1)}%
                    </span>
                  </p>
                )}
                <p className="text-slate-400">
                  Share of top:{' '}
                  <span className="text-blue-400 font-semibold">
                    {(((funnelStages.find(s => s.name === hoveredFunnelStage)?.count || 0) / (funnel?.leads || 1)) * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <h3 className="text-lg font-medium text-white mb-6 font-jetbrains">Recent Activities</h3>
          <div className="space-y-6">
            {recentLeads?.length ? (
              recentLeads.map((lead, i) => (
                <div key={i} className="flex space-x-3 group">
                  <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-200">
                      New lead <span className="font-semibold text-white font-jetbrains">{lead.first_name} {lead.last_name}</span> created
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <p className="text-sm">No recent activities.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Line/Area Trend Chart */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <h3 className="text-lg font-medium text-white mb-6 font-jetbrains flex items-center">
            <ArrowUpRight className="w-5 h-5 mr-2 text-purple-400" /> Pipeline Value Growth
          </h3>
          
          <div className="relative">
            <svg viewBox={`0 0 ${trendWidth} ${trendHeight}`} className="w-full h-auto">
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
                const y = trendPaddingTop + trendChartHeight * val;
                const gridVal = maxTrendVal - (maxTrendVal * val);
                return (
                  <g key={idx}>
                    <line 
                      x1={trendPaddingLeft} 
                      y1={y} 
                      x2={trendWidth - trendPaddingRight} 
                      y2={y} 
                      stroke="#1e293b" 
                      strokeWidth="1" 
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={trendPaddingLeft - 10} 
                      y={y + 4} 
                      textAnchor="end" 
                      fill="#64748b" 
                      className="text-[10px] font-mono select-none"
                    >
                      {formatCurrency(gridVal)}
                    </text>
                  </g>
                );
              })}

              {/* Area Under the Line */}
              {trendAreaPath && (
                <path d={trendAreaPath} fill="url(#area-grad)" />
              )}

              {/* Line */}
              {trendLinePath && (
                <path 
                  d={trendLinePath} 
                  fill="none" 
                  stroke="url(#line-grad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {trendPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredTrendPoint?.label === pt.label ? '6' : '4'}
                    className="fill-slate-950 stroke-purple-500 stroke-[3px] transition-all duration-150 cursor-pointer hover:stroke-pink-500"
                    onMouseEnter={() => setHoveredTrendPoint(pt)}
                    onMouseLeave={() => setHoveredTrendPoint(null)}
                  />
                  {/* X-Axis labels */}
                  <text 
                    x={pt.x} 
                    y={trendHeight - 10} 
                    textAnchor="middle" 
                    fill="#64748b" 
                    className="text-[10px] font-semibold font-mono select-none"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Custom Tooltip for Line Chart */}
            {hoveredTrendPoint && (
              <div 
                className="absolute bg-slate-950/95 border border-slate-800 rounded-lg p-3 text-xs font-mono shadow-xl backdrop-blur-md z-10 transition-all duration-75"
                style={{
                  left: `${(hoveredTrendPoint.x / trendWidth) * 100}%`,
                  top: `${(hoveredTrendPoint.y / trendHeight) * 100 - 30}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <p className="text-white font-bold">{hoveredTrendPoint.label} Cumulative</p>
                <p className="text-purple-400 font-semibold mt-1">
                  {formatCurrency(hoveredTrendPoint.value)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
