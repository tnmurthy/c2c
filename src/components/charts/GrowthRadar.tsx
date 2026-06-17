"use client";

import React, { useState, useMemo } from "react";

interface GrowthRadarProps {
  data?: { [key: string]: number };
  peerData?: { [key: string]: number };
}

const DEFAULT_DATA: { [key: string]: number } = {
  Technical: 92,
  Product: 85,
  Leadership: 78,
  Communication: 95,
  Adaptability: 98,
};

export default function GrowthRadar({ data = DEFAULT_DATA, peerData }: GrowthRadarProps) {
  const [view, setView] = useState<"self" | "peer" | "both">("both");

  const categories = Object.keys(data);
  const selfValues = Object.values(data);
  const peerValues = peerData ? categories.map(cat => peerData[cat] || 0) : null;

  // Center and radius for SVG
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35; // leave room for labels

  const getPoint = (value: number, index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const distance = (value / 100) * r;
    return {
      x: cx + distance * Math.cos(angle),
      y: cy + distance * Math.sin(angle),
    };
  };

  const selfPoints = selfValues.map((val, i) => getPoint(val, i, categories.length));
  const selfPath = selfPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const peerPoints = peerValues ? peerValues.map((val, i) => getPoint(val, i, categories.length)) : [];
  const peerPath = peerPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const levels = [20, 40, 60, 80, 100];

  return (
    <div className="flex flex-col items-center bg-black/40 border border-[#2fd9f4]/10 p-6 rounded-3xl relative overflow-hidden group w-full h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2fd9f4]/40 to-transparent"></div>
      
      <div className="flex justify-between items-center w-full mb-8 z-10">
        <div>
          <h3 className="text-xl font-bold text-white tracking-wide font-mono uppercase">360° Growth Trajectory</h3>
          <p className="text-[10px] text-[#2fd9f4]/50 uppercase tracking-[0.3em] font-bold mt-1">Longitudinal development mapping</p>
        </div>
        {peerData && (
          <div className="flex space-x-1 bg-gray-950/50 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setView("self")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all font-mono uppercase tracking-widest ${
                view === "self" ? "bg-[#2fd9f4]/20 text-[#2fd9f4] shadow-md border border-[#2fd9f4]/30" : "text-gray-400 hover:text-white"
              }`}
            >
              Self
            </button>
            <button
              onClick={() => setView("peer")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all font-mono uppercase tracking-widest ${
                view === "peer" ? "bg-[#d946ef]/20 text-[#d946ef] shadow-md border border-[#d946ef]/30" : "text-gray-400 hover:text-white"
              }`}
            >
              Peer
            </button>
            <button
              onClick={() => setView("both")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all font-mono uppercase tracking-widest ${
                view === "both" ? "bg-gray-800/80 text-white shadow-md border border-gray-600" : "text-gray-400 hover:text-white"
              }`}
            >
              Compare
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full max-w-[350px] aspect-square z-10 mx-auto flex-1">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Defs for glowing effects */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="self-poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2fd9f4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3626ce" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="peer-poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d946ef" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#86198f" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Polygons */}
          {levels.map((level, i) => {
            const levelPoints = categories.map((_, index) => getPoint(level, index, categories.length));
            const path = levelPoints.map((p) => `${p.x},${p.y}`).join(" ");
            return (
              <polygon
                key={`grid-${i}`}
                points={path}
                fill="none"
                stroke="rgba(47, 217, 244, 0.1)"
                strokeWidth="0.5"
                className={i === levels.length - 1 ? "stroke-[#2fd9f4]/30" : ""}
              />
            );
          })}

          {/* Axes */}
          {categories.map((_, i) => {
            const end = getPoint(100, i, categories.length);
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="rgba(47, 217, 244, 0.1)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Self Data Polygon */}
          {(view === "self" || view === "both") && (
            <polygon
              points={selfPath}
              fill="url(#self-poly-grad)"
              stroke="#2fd9f4"
              strokeWidth="1.5"
              filter="url(#glow)"
              className="transition-all duration-700 ease-in-out origin-center animate-[pulse_4s_easeInOut_infinite]"
              style={{ transformOrigin: "center" }}
            />
          )}

          {/* Peer Data Polygon */}
          {peerData && (view === "peer" || view === "both") && (
            <polygon
              points={peerPath}
              fill="url(#peer-poly-grad)"
              stroke="#d946ef"
              strokeWidth="2"
              strokeDasharray="4 4"
              filter="url(#glow)"
              className="transition-all duration-700 ease-in-out"
            />
          )}

          {/* Data Points (Dots) for Peer Data */}
          {peerData && (view === "peer" || view === "both") &&
            peerPoints.map((p, i) => (
              <g key={`p-peer-${i}`} className="group cursor-help">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="#0e1416"
                  stroke="#d946ef"
                  strokeWidth="1"
                  className="transition-all duration-700 ease-in-out"
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#d946ef" 
                  className="opacity-0 group-hover:opacity-30 transition-all"
                />
              </g>
            ))}

          {/* Data Points (Dots) for Self Data */}
          {(view === "self" || view === "both") &&
            selfPoints.map((p, i) => (
              <g key={`p-self-${i}`} className="group cursor-help">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="#0e1416"
                  stroke="#2fd9f4"
                  strokeWidth="1"
                  className="transition-all duration-700 ease-in-out"
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#2fd9f4" 
                  className="opacity-0 group-hover:opacity-30 transition-all"
                />
              </g>
            ))}

          {/* Outer Labels */}
          {categories.map((cat, i) => {
            const labelPos = getPoint(115, i, categories.length);
            let anchor = "middle";
            if (labelPos.x < cx - 10) anchor = "end";
            if (labelPos.x > cx + 10) anchor = "start";
            
            return (
              <text
                key={`label-${i}`}
                x={labelPos.x}
                y={labelPos.y}
                fill="#2fd9f4"
                opacity="0.6"
                fontSize="9"
                textAnchor={anchor as "middle" | "end" | "start"}
                dominantBaseline="middle"
                className="font-mono font-bold tracking-widest uppercase"
              >
                {cat}
              </text>
            );
          })}
        </svg>
      </div>

      {peerData && (
        <div className="flex w-full justify-center space-x-8 mt-6 border-t border-[#2fd9f4]/10 pt-4 z-10">
          <div className="flex items-center text-[10px] text-[#2fd9f4] font-bold font-mono uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-[#2fd9f4] mr-2 shadow-[0_0_8px_rgba(47,217,244,0.8)]"></div>
            Self
          </div>
          <div className="flex items-center text-[10px] text-[#d946ef] font-bold font-mono uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-[#d946ef] mr-2 shadow-[0_0_8px_rgba(217,70,239,0.8)]"></div>
            Peer 360 Overlay
          </div>
        </div>
      )}
    </div>
  );
}
