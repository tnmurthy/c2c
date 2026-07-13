"use client";

import React, { useState } from "react";
import { 
  CheckCircle, 
  Circle, 
  Map, 
  ArrowRight, 
  Brain, 
  User, 
  Users, 
  Briefcase,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Link from "next/link";

interface UserJourneyWidgetProps {
  studentProfile: any;
  hasAssessment: boolean;
  hasPeerFeedback: boolean;
  hasApplications: boolean;
  feedbackLinkCopied: boolean;
  onCopyFeedbackLink: () => void;
}

export default function UserJourneyWidget({
  studentProfile,
  hasAssessment,
  hasPeerFeedback,
  hasApplications,
  feedbackLinkCopied,
  onCopyFeedbackLink
}: UserJourneyWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Journey steps evaluation
  const isProfileComplete = !!(studentProfile?.department && studentProfile?.graduation_year && studentProfile?.skills?.length);
  
  const steps = [
    {
      id: 1,
      title: "Complete Student Profile",
      desc: "Ensure your department, graduation year, and skills are set.",
      completed: isProfileComplete,
      icon: <User className="w-5 h-5" />,
      action: !isProfileComplete ? (
        <span className="text-xs font-mono text-cyan-400 font-bold">Fill in details above</span>
      ) : null
    },
    {
      id: 2,
      title: "Initialize The Ordeal (Assessment)",
      desc: "Unlock your cognitive & behavioral archetype metrics.",
      completed: hasAssessment,
      icon: <Brain className="w-5 h-5" />,
      action: !hasAssessment ? (
        <Link 
          href="/assessment"
          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 rounded-sm font-mono text-[10px] font-black uppercase tracking-wider transition-all"
        >
          Take Assessment
        </Link>
      ) : null
    },
    {
      id: 3,
      title: "Get Classmate 360° Peer Feedback",
      desc: "Supplement your matching quotients with peer assessments.",
      completed: hasPeerFeedback,
      icon: <Users className="w-5 h-5" />,
      action: (
        <button
          onClick={onCopyFeedbackLink}
          className="px-3 py-1 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-400 rounded-sm font-mono text-[10px] font-black uppercase tracking-wider transition-all"
        >
          {feedbackLinkCopied ? "Copied Link!" : "Copy Link"}
        </button>
      )
    },
    {
      id: 4,
      title: "Express Interest in Job Matches",
      desc: "Apply to high-impact career opportunities tailored to your fit.",
      completed: hasApplications,
      icon: <Briefcase className="w-5 h-5" />,
      action: !hasApplications ? (
        <span className="text-xs font-mono text-white/40">Apply to job matches below</span>
      ) : null
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="relative bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8 overflow-hidden transition-all duration-300">
      {/* Top indicator bar */}
      <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500" style={{ width: "100%" }}></div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-lg font-black text-white font-mono uppercase tracking-tight">Your c2c Placement Journey</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black font-mono">Step-by-step navigation directives</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs text-[#bbc9cd]">Progress:</span>
            <span className="text-sm font-black text-cyan-400">{progressPercent}%</span>
            <span className="text-[10px] text-white/30">({completedCount}/{steps.length} Steps)</span>
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 animate-fadeIn">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`relative bg-black/30 border p-5 rounded-xl flex flex-col justify-between transition-all group ${
                step.completed 
                  ? "border-green-500/20 hover:border-green-500/40" 
                  : "border-white/5 hover:border-cyan-500/20"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-sm border ${
                    step.completed 
                      ? "bg-green-500/10 border-green-500/20 text-green-400" 
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}>
                    {step.icon}
                  </div>
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/10 shrink-0" />
                  )}
                </div>
                
                <h4 className={`font-mono text-sm font-black uppercase tracking-tight mb-2 ${
                  step.completed ? "text-green-400/80" : "text-white"
                }`}>
                  {step.id}. {step.title}
                </h4>
                
                <p className="text-xs text-[#bbc9cd]/70 leading-relaxed font-sans mb-4">
                  {step.desc}
                </p>
              </div>

              {step.action && (
                <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-end">
                  {step.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
