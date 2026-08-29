import React, { useState } from 'react';
import { Upload, ChevronRight, CheckCircle2, Circle, Sparkles, Github } from 'lucide-react';
import ResumeUploadModal from './ResumeUploadModal';
import { ProfileExpansionModal } from './ProfileExpansionModal';

interface ProfileCompletionWidgetProps {
  student: any;
  onProfileUpdate: () => void;
}

export default function ProfileCompletionWidget({ student, onProfileUpdate }: ProfileCompletionWidgetProps) {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);

  // Calculate profile completion
  const fields = [
    { key: 'basics', label: 'Basic Info', isComplete: !!(student.full_name && student.email) },
    { key: 'education', label: 'Education Details', isComplete: !!(student.department && student.graduation_year) },
    { key: 'skills', label: 'Technical Skills', isComplete: !!(student.skills && student.skills.length > 0) },
    { key: 'resume', label: 'Resume Upload', isComplete: !!student.resume_url },
    { key: 'contact', label: 'Contact Info', isComplete: !!(student.phone || student.linkedin_url) }
  ];

  const completedFields = fields.filter(f => f.isComplete).length;
  const progressPercentage = Math.round((completedFields / fields.length) * 100);

  return (
    <>
      <div className="bg-[#0e1416]/50 border border-cyan-500/20 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-bold font-mono uppercase tracking-widest text-sm mb-1">
              Profile Setup & Enrichment
            </h3>
            <p className="text-[#bbc9cd]/60 text-xs font-mono">
              Complete details and auto-discover skills to elevate your placement match rate.
            </p>
          </div>
          <div className="text-right">
            <div className="text-cyan-400 font-mono font-bold text-xl">{progressPercentage}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#1a2326] rounded-full h-1.5 mb-5 overflow-hidden">
          <div 
            className="bg-cyan-500 h-1.5 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>

        {/* Missing Items */}
        <div className="space-y-2 mb-5">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center justify-between text-xs font-mono">
              <div className={`flex items-center gap-2 ${field.isComplete ? 'text-green-400/80' : 'text-white/40'}`}>
                {field.isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                {field.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setIsResumeModalOpen(true)}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Resume Upload
          </button>
          <button
            onClick={() => setIsExpansionModalOpen(true)}
            className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-[#c3c0ff] border border-indigo-500/30 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Discover from GitHub
          </button>
        </div>
      </div>

      <ResumeUploadModal 
        isOpen={isResumeModalOpen} 
        onClose={() => setIsResumeModalOpen(false)} 
        student={student}
        onSuccess={() => {
          setIsResumeModalOpen(false);
          onProfileUpdate();
        }}
      />

      <ProfileExpansionModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        student={student}
        onSkillsUpdated={() => {
          onProfileUpdate();
        }}
      />
    </>
  );
}
