"use client";

import React, { useState } from "react";
import type { DimensionScores } from "@/types";

interface HistoryPoint {
  attempt_number: number;
  dimension_scores: DimensionScores;
  created_at: string;
}

interface TrendLineChartProps {
  history: HistoryPoint[] | null | undefined;
}

export default function TrendLineChart({ history }: TrendLineChartProps) {
  const [activeDim, setActiveDim] = useState<string | null>(null); // null means show all

  const dataPoints = history || [];

  if (dataPoints.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <span className="text-white/20 text-xs font-mono uppercase tracking-widest mb-2">Trend Telemetry Offline</span>
        <p className="text-sm text-[#bbc9cd] max-w-xs font-sans leading-relaxed">
          Retake the psychometric assessment once the retake cooldown expires to activate historical trend analysis.
        </p>
      </div>
    );
  }

  // Dimension details mapping for colors and names
  const dimConfig: Record<string, { color: string; label: string; glow: string }> = {
    IQ: { color: "#06b6d4", label: "IQ (Cognitive)", glow: "rgba(6, 182, 212, 0.4)" },
    EQ: { color: "#6366f1", label: "EQ (Emotional)", glow: "rgba(99, 102, 241, 0.4)" },
    AQ: { color: "#d946ef", label: "AQ (Adversity)", glow: "rgba(217, 70, 239, 0.4)" },
    SQ: { color: "#10b981", label: "SQ (Social)", glow: "rgba(16, 185, 129, 0.4)" },
    SpQ: { color: "#f59e0b", label: "SpQ (Purpose)", glow: "rgba(245, 158, 11, 0.4)" }
  };

  const dimensions = Object.keys(dimConfig);

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // X Scaling: distributes attempts along horizontal plane
  const getX = (index: number) => {
    if (dataPoints.length <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (dataPoints.length - 1)) * chartWidth;
  };

  // Y Scaling: maps 0-100 score dynamically to vertical viewport
  const getY = (score: number) => {
    // Scores are assumed 0-100
    const normalized = Math.max(0, Math.min(100, score));
    return paddingY + chartHeight - (normalized / 100) * chartHeight;
  };

  // Build SVG path string for a specific dimension key
  const buildPath = (dimKey: string) => {
    let path = "";
    dataPoints.forEach((point, idx) => {
      const scores = point.dimension_scores as Record<string, any>;
      const score = Number(scores[dimKey]) || 0;
      const x = getX(idx);
      const y = getY(score);
      if (idx === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return path;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500/40 to-transparent"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
            Historical Trendline
          </h3>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black font-mono">LONGITUDINAL_SCORE_GROWTH</p>
        </div>

        {/* Dimension Toggles */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveDim(null)}
            className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider rounded-sm transition-all border ${
              activeDim === null 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-transparent border-white/5 text-white/40 hover:text-white/70"
            }`}
          >
            ALL
          </button>
          {dimensions.map(dim => (
            <button
              key={dim}
              onClick={() => setActiveDim(dim)}
              className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider rounded-sm transition-all border`}
              style={{
                borderColor: activeDim === dim ? dimConfig[dim].color : "rgba(255, 255, 255, 0.05)",
                backgroundColor: activeDim === dim ? `${dimConfig[dim].color}15` : "transparent",
                color: activeDim === dim ? dimConfig[dim].color : "rgba(255, 255, 255, 0.4)"
              }}
            >
              {dim}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Grids */}
          {[0, 25, 50, 75, 100].map(val => (
            <g key={val} className="opacity-20">
              <line 
                x1={paddingX} 
                y1={getY(val)} 
                x2={width - paddingX} 
                y2={getY(val)} 
                stroke="rgba(255, 255, 255, 0.2)" 
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text 
                x={paddingX - 10} 
                y={getY(val) + 3} 
                fill="rgba(255, 255, 255, 0.4)" 
                fontSize="9" 
                fontFamily="monospace"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {dataPoints.map((point, idx) => (
            <text
              key={idx}
              x={getX(idx)}
              y={height - paddingY + 18}
              fill="rgba(255, 255, 255, 0.4)"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Run {point.attempt_number}
            </text>
          ))}

          {/* Render Lines */}
          {dimensions.map(dimKey => {
            const isDimActive = activeDim === null || activeDim === dimKey;
            if (!isDimActive) return null;

            return (
              <g key={dimKey}>
                {/* Glow Filter Line */}
                <path
                  d={buildPath(dimKey)}
                  fill="none"
                  stroke={dimConfig[dimKey].color}
                  strokeWidth="3.5"
                  strokeOpacity="0.15"
                  className="blur-sm transition-all duration-300"
                />
                {/* Core Path Line */}
                <path
                  d={buildPath(dimKey)}
                  fill="none"
                  stroke={dimConfig[dimKey].color}
                  strokeWidth="2.5"
                  className="transition-all duration-300"
                />

                {/* Score Point Handles */}
                {dataPoints.map((point, idx) => {
                  const scores = point.dimension_scores as Record<string, any>;
                  const score = Number(scores[dimKey]) || 0;
                  const x = getX(idx);
                  const y = getY(score);

                  return (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#0e1416"
                        stroke={dimConfig[dimKey].color}
                        strokeWidth="2.5"
                        className="transition-all hover:scale-125"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill={dimConfig[dimKey].color}
                        fillOpacity="0"
                        className="hover:fill-opacity-10 transition-all"
                      />
                      {/* Interactive score tooltips */}
                      <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none">
                        <rect
                          x={x - 22}
                          y={y - 28}
                          width="44"
                          height="20"
                          rx="3"
                          fill="black"
                          stroke={dimConfig[dimKey].color}
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 15}
                          fill="white"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {score}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
