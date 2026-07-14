'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Monitor, ArrowLeft } from 'lucide-react';

interface WindowState {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RetroPortfolio() {
  const { id } = useParams();
  const router = useRouter();
  
  const [booting, setBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  
  // Clock state
  const [timeStr, setTimeStr] = useState('12:00 PM');
  
  // Start Menu state
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // DOS terminal history
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Microsoft(R) Windows 95',
    '(C)Copyright Microsoft Corp 1981-1995.',
    '',
    'C:\\> type readme.txt',
    'Welcome to the Campus to Corporate (C2C) retro compiler.',
    'Type "help" to list available command parameters.',
    '',
    'C:\\>'
  ]);

  // Window states
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'about', title: 'About Candidate', icon: '💻', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 50, y: 50, width: 450, height: 300 },
    { id: 'resume', title: 'My Resume', icon: '📝', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 100, y: 80, width: 450, height: 380 },
    { id: 'projects', title: 'Competency Vectors', icon: '📁', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 150, y: 110, width: 400, height: 280 },
    { id: 'dos', title: 'MS-DOS Prompt', icon: '📟', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 80, y: 120, width: 500, height: 350 },
    { id: 'scores', title: 'Cognitive Matrix', icon: '📊', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 200, y: 150, width: 400, height: 320 },
    { id: 'cv_tailor', title: 'CV Tailor', icon: '👔', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 220, y: 180, width: 550, height: 480 },
  ]);

  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(10);

  // Dragging states
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // CV Tailor State
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isCustomJd, setIsCustomJd] = useState<boolean>(false);
  const [tailorLoading, setTailorLoading] = useState<boolean>(false);
  const [tailoredResults, setTailoredResults] = useState<any>(null);

  // Fetch student alerts
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch(`/api/alerts/student/${id}`);
        if (response.ok) {
          const data = await response.json();
          setAlerts(data || []);
          if (data && data.length > 0) {
            const firstLead = data.find((a: any) => a.market_leads);
            if (firstLead) {
              setSelectedLeadId(String(firstLead.market_leads.id));
              setJobDescription(firstLead.market_leads.ai_summary || firstLead.market_leads.ai_notes || '');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch student alerts:', err);
      }
    }
    if (id) {
      fetchAlerts();
    }
  }, [id]);

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'custom') {
      setIsCustomJd(true);
      setJobDescription('');
    } else {
      setIsCustomJd(false);
      const alertItem = alerts.find((a: any) => a.market_leads && String(a.market_leads.id) === leadId);
      if (alertItem) {
        setJobDescription(alertItem.market_leads.ai_summary || alertItem.market_leads.ai_notes || '');
      } else {
        setJobDescription('');
      }
    }
  };

  const handleTailorCV = async () => {
    if (!studentData) return;
    setTailorLoading(true);
    setTailoredResults(null);
    try {
      const candidatePayload = {
        full_name: studentData.full_name || 'Student',
        department: studentData.department || 'General',
        skills: studentData.skills || [],
        archetype: assessment?.primary_profile || 'builder',
        location: studentData.location || 'San Francisco'
      };

      const resumePromise = fetch('/api/market/generate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      const coverLetterPromise = fetch('/api/market/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      const outreachPromise = fetch('/api/market/generate/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posting: jobDescription,
          candidate: candidatePayload,
          style: 'cold_email'
        })
      });

      const [resResume, resCoverLetter, resOutreach] = await Promise.all([
        resumePromise,
        coverLetterPromise,
        outreachPromise
      ]);

      if (resResume.ok && resCoverLetter.ok && resOutreach.ok) {
        const resumeData = await resResume.json();
        const coverLetterData = await resCoverLetter.json();
        const outreachData = await resOutreach.json();
        setTailoredResults({
          resume: resumeData,
          coverLetter: coverLetterData,
          outreach: outreachData
        });
      } else {
        console.error('One or more tailor APIs failed');
      }
    } catch (err) {
      console.error('Error tailoring CV:', err);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!studentData) return;
    try {
      const candidatePayload = {
        full_name: studentData.full_name || 'Student',
        department: studentData.department || 'General',
        skills: studentData.skills || [],
        archetype: assessment?.primary_profile || 'builder',
        location: studentData.location || 'San Francisco'
      };

      const response = await fetch('/api/market/download/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nameStr = studentData.full_name || 'Student';
        a.download = `tailored_resume_${nameStr.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download tailored resume PDF');
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  // Load candidate details
  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, assessments(*)')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (data) {
          setStudentData(data);
          if (data.assessments && data.assessments.length > 0) {
            setAssessment(data.assessments[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load portfolio details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Boot screen animation
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setBootProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBooting(false), 500);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [loading]);

  // Clock tick
  useEffect(() => {
    const tick = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      setTimeStr(`${hours}:${minStr} ${ampm}`);
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openWindow = (windowId: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setWindows(prev => prev.map(w => {
      if (w.id === windowId) {
        return { ...w, isOpen: true, isMinimized: false, isMaximized: isMobile ? true : w.isMaximized, zIndex: nextZ };
      }
      return w;
    }));
    setActiveWindowId(windowId);
  };

  const closeWindow = (windowId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows(prev => prev.map(w => {
      if (w.id === windowId) return { ...w, isOpen: false };
      return w;
    }));
    if (activeWindowId === windowId) setActiveWindowId(null);
  };

  const minimizeWindow = (windowId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows(prev => prev.map(w => {
      if (w.id === windowId) return { ...w, isMinimized: true };
      return w;
    }));
    if (activeWindowId === windowId) setActiveWindowId(null);
  };

  const maximizeWindow = (windowId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows(prev => prev.map(w => {
      if (w.id === windowId) return { ...w, isMaximized: !w.isMaximized };
      return w;
    }));
  };

  const focusWindow = (windowId: string) => {
    if (activeWindowId === windowId) return;
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setWindows(prev => prev.map(w => {
      if (w.id === windowId) return { ...w, zIndex: nextZ, isMinimized: false };
      return w;
    }));
    setActiveWindowId(windowId);
  };

  // Draggable Window Logic
  const handleMouseDown = (windowId: string, e: React.MouseEvent) => {
    focusWindow(windowId);
    const w = windows.find(win => win.id === windowId);
    if (!w || w.isMaximized) return;
    setDraggedWindow(windowId);
    dragOffset.current = {
      x: e.clientX - w.x,
      y: e.clientY - w.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedWindow) return;
      setWindows(prev => prev.map(w => {
        if (w.id === draggedWindow) {
          return {
            ...w,
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
          };
        }
        return w;
      }));
    };

    const handleMouseUp = () => {
      setDraggedWindow(null);
    };

    if (draggedWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedWindow]);

  // DOS terminal logic
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = terminalInput.trim().toLowerCase();
    let reply: string[] = [];

    if (input === 'help') {
      reply = [
        'Available commands:',
        '  HELP       - Lists available command keys.',
        '  DIR        - Lists dossier files on system.',
        '  CAT <file> - Reads file content (e.g. cat resume.txt).',
        '  SCORES     - Prints evaluated dimension vectors.',
        '  CLEAR      - Resets terminal log.',
        '  EXIT       - Closes MS-DOS prompt window.'
      ];
    } else if (input === 'dir') {
      reply = [
        ' Volume in drive C has no label.',
        ' Directory of C:\\',
        '',
        '06/17/2026  12:00 PM    <DIR>          featured_vectors',
        '06/17/2026  12:00 PM             1,024 resume.txt',
        '06/17/2026  12:00 PM               412 scores.log',
        '               2 File(s)          1,436 bytes',
        '               1 Dir(s)     92,120,442 bytes free'
      ];
    } else if (input === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (input === 'exit') {
      closeWindow('dos');
      setTerminalInput('');
      return;
    } else if (input === 'scores') {
      if (assessment && assessment.dimension_scores) {
        reply = ['C2C Neural Cognitive Vector Scores:', '------------------------------------'];
        Object.entries(assessment.dimension_scores).forEach(([dim, sc]) => {
          reply.push(`  ${dim.toUpperCase()}: ${sc}/100`);
        });
      } else {
        reply = ['No assessed scores matching current operator profile found.'];
      }
    } else if (input.startsWith('cat ')) {
      const filename = input.substring(4).trim();
      if (filename === 'resume.txt') {
        reply = [
          `Candidate: ${studentData?.full_name || 'N/A'}`,
          `Department: ${studentData?.department || 'N/A'}`,
          `Graduation: ${studentData?.graduation_year || 'N/A'}`,
          `Primary Archetype: ${assessment?.primary_profile || 'Unknown'}`
        ];
      } else if (filename === 'scores.log') {
        reply = [
          'Evaluated Matrix Status: STABLE',
          `Archetype: ${assessment?.primary_profile || 'N/A'}`,
          `Primary Dimension Vector: ${assessment?.primary_profile === 'Builder' ? 'IQ + AQ' : 'EQ + SQ'}`
        ];
      } else {
        reply = [`File not found: ${filename}`];
      }
    } else if (input) {
      reply = [`Bad command or filename: "${terminalInput}"`];
    }

    setTerminalHistory(prev => [...prev, `C:\\> ${terminalInput}`, ...reply, '']);
    setTerminalInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center font-mono text-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
          <p className="text-cyan-400 text-xs tracking-[0.3em] font-black uppercase animate-pulse">Decompressing_Legend_Dossier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none font-mono text-[#000]">
      {/* 1. Retro Boot Screen */}
      {booting && (
        <div className="absolute inset-0 bg-[#000] z-[9999] flex flex-col justify-between p-16 text-white font-mono select-none">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Retro Windows Cloud Emblem */}
            <div className="text-center">
              <div className="text-6xl font-sans font-black tracking-tighter text-blue-500 italic mb-2 select-none">
                Microsoft
              </div>
              <div className="text-4xl font-sans font-bold tracking-tight text-white mb-8 select-none">
                Windows<span className="text-red-500 text-2xl font-black align-super">95</span>
              </div>
            </div>
            {/* Loading Progress Bar */}
            <div className="w-64 h-6 border-2 border-white p-1 rounded-none flex items-center overflow-hidden bg-[#000]">
              <div 
                className="h-full bg-blue-600 transition-all duration-100 ease-out" 
                style={{ width: `${bootProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-2">Initializing Dossier System</p>
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-600 uppercase font-black tracking-widest">
            <span>Core Version 4.00.950</span>
            <span>Campus to Corporate (C2C) Matrix</span>
          </div>
        </div>
      )}

      {/* Retro CSS Styles injected locally */}
      <style jsx global>{`
        .retro-win95-desktop {
          background-color: #008080;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
        .desktop-shortcut {
          width: 80px;
          height: 80px;
          margin: 15px;
          display: flex;
          flex-col: column;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .desktop-shortcut:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px dotted rgba(255, 255, 255, 0.5);
        }
        .desktop-shortcut-icon {
          font-size: 32px;
          margin-bottom: 5px;
        }
        .desktop-shortcut-label {
          color: #fff;
          font-size: 10px;
          text-align: center;
          text-shadow: 1px 1px #000;
          font-weight: bold;
        }
        
        /* Win95 Window Border & Relief styling */
        .win95-window {
          background-color: #c0c0c0;
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          box-shadow: 1px 1px 0 #000;
          display: flex;
          flex-direction: column;
          position: absolute;
        }
        .win95-title-bar {
          background: linear-gradient(90deg, #000080, #1084d0);
          color: #fff;
          padding: 3px 6px;
          font-weight: bold;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: move;
        }
        .win95-title-bar.inactive {
          background: #808080;
        }
        .win95-title-controls {
          display: flex;
          gap: 2px;
        }
        .win95-btn {
          background-color: #c0c0c0;
          border: 1px solid;
          border-color: #fff #808080 #808080 #fff;
          color: #000;
          font-size: 9px;
          font-weight: bold;
          padding: 1px 5px;
          cursor: pointer;
          min-width: 14px;
          text-align: center;
        }
        .win95-btn:active {
          border-color: #808080 #fff #fff #808080;
        }
        .win95-body {
          flex: 1;
          padding: 10px;
          overflow-y: auto;
          font-size: 12px;
          background-color: #fff;
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          margin: 4px;
        }
        
        /* Taskbar Relief classes */
        .win95-taskbar {
          background-color: #c0c0c0;
          border-top: 2px solid #fff;
          height: 40px;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          padding: 3px 6px;
          gap: 4px;
          z-index: 999;
        }
        .taskbar-btn {
          border: 1px solid;
          border-color: #fff #808080 #808080 #fff;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          background-color: #c0c0c0;
        }
        .taskbar-btn.active {
          border-color: #808080 #fff #fff #808080;
          background-color: #e0e0e0;
        }
        .win95-clock {
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          padding: 4px 8px;
          font-size: 11px;
          background-color: #c0c0c0;
          margin-left: auto;
          min-width: 80px;
          text-align: center;
        }
        
        /* Start Menu styles */
        .win95-start-menu {
          position: absolute;
          bottom: 40px;
          left: 2px;
          background-color: #c0c0c0;
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
          width: 170px;
          display: flex;
          z-index: 10000;
        }
        .start-sidebar {
          background: linear-gradient(180deg, #000080, #1084d0);
          color: #fff;
          width: 30px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 10px;
          font-weight: bold;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 14px;
        }
        .start-menu-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2px;
        }
        .start-menu-item {
          padding: 6px 12px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
        }
        .start-menu-item:hover {
          background-color: #000080;
          color: #fff;
        }
        .submenu-arrow {
          margin-left: auto;
          font-size: 9px;
        }
        .start-submenu {
          position: absolute;
          left: 100%;
          top: 0;
          background-color: #c0c0c0;
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          width: 160px;
          display: flex;
          flex-direction: column;
          padding: 2px;
          box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Main retro desktop area */}
      <div className="retro-win95-desktop">
        {/* Desktop shortcuts */}
        {!isMobile && (
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('about')}>
              <span className="desktop-shortcut-icon">💻</span>
              <span className="desktop-shortcut-label">My Computer</span>
            </div>
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('resume')}>
              <span className="desktop-shortcut-icon">📝</span>
              <span className="desktop-shortcut-label">My Resume</span>
            </div>
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('projects')}>
              <span className="desktop-shortcut-icon">📁</span>
              <span className="desktop-shortcut-label">Competencies</span>
            </div>
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('scores')}>
              <span className="desktop-shortcut-icon">📊</span>
              <span className="desktop-shortcut-label">CogMatrix</span>
            </div>
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('dos')}>
              <span className="desktop-shortcut-icon">📟</span>
              <span className="desktop-shortcut-label">MS-DOS Prompt</span>
            </div>
            <div className="desktop-shortcut" onDoubleClick={() => openWindow('cv_tailor')}>
              <span className="desktop-shortcut-icon">👔</span>
              <span className="desktop-shortcut-label">CV Tailor</span>
            </div>
            <div 
              className="desktop-shortcut" 
              onClick={() => window.open(`https://github.com`, '_blank')}
            >
              <span className="desktop-shortcut-icon">🌐</span>
              <span className="desktop-shortcut-label">GitHub</span>
            </div>
          </div>
        )}

        {/* Mobile DOS Menu program selector */}
        {isMobile && (
          <div className="absolute inset-x-0 top-0 bottom-10 bg-[#000080] text-[#c0c0c0] font-mono p-4 flex flex-col z-[1]">
            <div className="border-2 border-double border-white p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="text-center text-white bg-blue-800 font-bold px-2 py-1 uppercase border-b-2 border-white mb-6">
                  === C2C COGNITIVE DIRECTORY ===
                </div>
                <p className="text-xs text-cyan-300 mb-6 text-center leading-relaxed">
                  Screen calibration detected: MOBILE NODE.
                  Tap an application key below to establish connection.
                </p>
                
                <div className="space-y-3 max-w-sm mx-auto">
                  {[
                    { id: 'about', label: '💻 My Computer', desc: 'View cognitive archetype details' },
                    { id: 'resume', label: '📝 My Resume', desc: 'Access educational & score records' },
                    { id: 'projects', label: '📁 Competencies', desc: 'Inspect dimension quotient density' },
                    { id: 'scores', label: '📊 CogMatrix', desc: 'Review developmental feedback directives' },
                    { id: 'dos', label: '📟 MS-DOS Shell', desc: 'Run low-level console diagnostics' },
                    { id: 'cv_tailor', label: '👔 CV Tailor', desc: 'Tailor resume & cover letters' },
                  ].map((app) => (
                    <button
                      key={app.id}
                      onClick={() => openWindow(app.id)}
                      className="w-full text-left bg-[#c0c0c0] text-[#000] border-2 border-white border-r-[#808080] border-b-[#808080] p-3 text-xs font-bold font-mono tracking-wider flex flex-col gap-1 active:border-r-white active:border-b-white"
                    >
                      <span className="text-[#000080] font-bold">{app.label}</span>
                      <span className="text-[10px] text-gray-700 font-normal">{app.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-center text-[10px] text-gray-500 uppercase tracking-widest pt-4">
                C2C MOBILE OPERATING SHELL v1.95
              </div>
            </div>
          </div>
        )}


        {/* Back Link Button for Next.js Context */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => router.push(`/dashboard/${id}`)}
            className="px-4 py-2 border-2 border-white text-white font-bold bg-[#008080] hover:brightness-110 shadow-md flex items-center gap-2 text-xs font-mono tracking-widest uppercase border-r-[#808080] border-b-[#808080] border-t-[#fff] border-l-[#fff]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back_to_Dash
          </button>
        </div>

        {/* Render Windows */}
        {windows.map(w => {
          if (!w.isOpen) return null;
          if (w.isMinimized) return null;

          const isWindowActive = activeWindowId === w.id;

          return (
            <div
              key={w.id}
              className="win95-window"
              style={{
                top: (w.isMaximized || isMobile) ? '0' : `${w.y}px`,
                left: (w.isMaximized || isMobile) ? '0' : `${w.x}px`,
                width: (w.isMaximized || isMobile) ? '100vw' : `${w.width}px`,
                height: (w.isMaximized || isMobile) ? 'calc(100vh - 40px)' : `${w.height}px`,
                zIndex: w.zIndex,
              }}
              onClick={() => focusWindow(w.id)}
            >
              {/* Window Header */}
              <div 
                className={`win95-title-bar ${isWindowActive ? '' : 'inactive'}`}
                onMouseDown={(e) => handleMouseDown(w.id, e)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{w.icon}</span>
                  <span className="win95-title">{w.title}</span>
                </div>
                <div className="win95-title-controls" onMouseDown={(e) => e.stopPropagation()}>
                  <button className="win95-btn" onClick={(e) => minimizeWindow(w.id, e)} aria-label="Minimize">_</button>
                  <button className="win95-btn" onClick={(e) => maximizeWindow(w.id, e)} aria-label="Maximize">□</button>
                  <button className="win95-btn" onClick={(e) => closeWindow(w.id, e)} aria-label="Close">X</button>
                </div>
              </div>

              {/* Window Content */}
              <div className="win95-body">
                {w.id === 'about' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-gray-400 pb-2">{studentData?.full_name || 'Candidate'}</h2>
                    <p className="text-xs leading-relaxed">
                      <strong>Cognitive Archetype:</strong> {assessment?.primary_profile || 'Unknown'}<br />
                      <strong>Specialization:</strong> {studentData?.department || 'N/A'}<br />
                      <strong>Datalink Status:</strong> ONLINE / ACTIVE
                    </p>
                    <p className="text-xs text-gray-700 italic border-l-2 border-blue-800 pl-4 py-2 bg-gray-100">
                      {assessment?.development_report?.profile_summary || 'No profile summary telemetry loaded.'}
                    </p>
                    <button className="win95-btn mt-4 px-4 py-1.5" onClick={() => openWindow('resume')}>View Technical Resume</button>
                  </div>
                )}

                {w.id === 'resume' && (
                  <div className="space-y-4 font-sans text-xs">
                    <div className="text-center font-serif text-lg font-black">{studentData?.full_name}</div>
                    <div className="text-center text-[10px] text-gray-500 font-mono tracking-widest">{studentData?.email}</div>
                    <hr className="border-gray-400" />
                    
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2 font-sans">Academic Foundation</h4>
                      <p>
                        <strong>Degree & Major:</strong> {studentData?.department}<br />
                        <strong>Graduation Year:</strong> {studentData?.graduation_year}<br />
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2 font-sans">Cognitive Capacity Parameters</h4>
                      <p className="italic mb-2">Evaluated via modular psychometric assessment engine:</p>
                      {assessment?.dimension_scores ? (
                        <ul className="list-disc pl-4 space-y-1 font-mono">
                          {Object.entries(assessment.dimension_scores).map(([dim, score]) => (
                            <li key={dim}>{dim.toUpperCase()} Vector score: {score as any}/100</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 font-mono">Assessment scores uninitialized.</p>
                      )}
                    </div>
                  </div>
                )}

                {w.id === 'projects' && (
                  <div className="space-y-4">
                    <h3 className="font-bold border-b border-gray-400 pb-2">Psychometric Dimensions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assessment?.dimension_scores ? (
                        Object.entries(assessment.dimension_scores).map(([dim, score]: any) => (
                          <div key={dim} className="border border-gray-400 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => openWindow('scores')}>
                            <div className="font-bold text-blue-800">{dim.toUpperCase()} Index</div>
                            <div className="text-lg font-bold font-mono">{score}% Density</div>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-2 text-center text-gray-500">No dimensions unlocked.</p>
                      )}
                    </div>
                  </div>
                )}

                {w.id === 'scores' && (
                  <div className="space-y-4">
                    <h3 className="font-bold border-b border-gray-400 pb-2">Optimization Protocols</h3>
                    <p className="text-xs">Based on candidate evaluation, the following optimization directives are issued:</p>
                    {assessment?.development_report?.actionable_feedback ? (
                      <ul className="list-disc pl-4 space-y-2 text-xs">
                        {assessment.development_report.actionable_feedback.map((f: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500">No actionable feedback directives compiled.</p>
                    )}
                  </div>
                )}

                {w.id === 'dos' && (
                  <div className="w-full h-full bg-[#000] text-[#0f0] p-4 font-mono text-xs flex flex-col justify-between overflow-y-auto">
                    <div className="flex-1 whitespace-pre-wrap select-text mb-4">
                      {terminalHistory.map((line, idx) => (
                        <div key={idx} className="min-h-[1.2em]">{line}</div>
                      ))}
                    </div>
                    <form onSubmit={handleTerminalSubmit} className="flex gap-2 items-center">
                      <span className="shrink-0">C:\&gt;</span>
                      <input
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-[#0f0] font-mono text-xs select-text focus:ring-0"
                        autoFocus
                      />
                    </form>
                  </div>
                )}

                {w.id === 'cv_tailor' && (
                  <div className="space-y-4 text-xs font-sans">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold">Select Opportunity Alert:</label>
                      <select 
                        className="w-full border-2 border-gray-600 bg-white p-1 text-black font-sans outline-none"
                        value={selectedLeadId}
                        onChange={(e) => handleLeadChange(e.target.value)}
                        disabled={tailorLoading}
                      >
                        <option value="">-- Choose an Alert --</option>
                        {alerts.map((a: any) => {
                          const lead = a.market_leads;
                          if (!lead) return null;
                          return (
                            <option key={lead.id} value={lead.id}>
                              {lead.company || 'Unknown Company'} - {lead.name || 'Job Lead'} (Score: {a.score}%)
                            </option>
                          );
                        })}
                        <option value="custom">Paste Custom Job Description</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="custom-jd-checkbox" 
                        checked={isCustomJd} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleLeadChange('custom');
                          } else {
                            handleLeadChange('');
                          }
                        }}
                        disabled={tailorLoading}
                      />
                      <label htmlFor="custom-jd-checkbox" className="select-none font-bold">Paste Custom JD</label>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold">Job Description Details:</label>
                      <textarea
                        rows={5}
                        className="w-full border-2 border-gray-600 bg-white p-1 text-black font-sans outline-none resize-none"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste details here..."
                        disabled={tailorLoading || (!isCustomJd && selectedLeadId !== '')}
                      />
                    </div>

                    <button
                      className="win95-btn px-4 py-1.5 font-bold flex items-center justify-center disabled:opacity-50"
                      onClick={handleTailorCV}
                      disabled={tailorLoading || !jobDescription}
                    >
                      {tailorLoading ? 'Tailoring in Progress...' : 'Tailor CV'}
                    </button>

                    {tailoredResults && (
                      <div className="mt-4 space-y-4 border-2 border-gray-600 p-2 bg-gray-50 max-h-72 overflow-y-auto">
                        <div>
                          <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">1. Tailored Resume Preview</div>
                          <div className="space-y-1 font-mono text-[11px] bg-white p-2 border border-gray-300">
                            <div><strong>Candidate:</strong> {tailoredResults.resume.candidate_name}</div>
                            <div><strong>Department:</strong> {tailoredResults.resume.department}</div>
                            <div><strong>Role Title:</strong> {tailoredResults.resume.role_title}</div>
                            <div><strong>Company:</strong> {tailoredResults.resume.company}</div>
                            <div><strong>Location:</strong> {tailoredResults.resume.location}</div>
                            <div><strong>Voice Hook:</strong> {tailoredResults.resume.voice_hook}</div>
                            <div><strong>Summary:</strong> {tailoredResults.resume.archetype_summary}</div>
                            {tailoredResults.resume.top_skills && (
                              <div><strong>Top Skills:</strong> {tailoredResults.resume.top_skills.join(', ')}</div>
                            )}
                            {tailoredResults.resume.matched_tech && (
                              <div><strong>Matched Tech:</strong> {tailoredResults.resume.matched_tech.join(', ')}</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">2. Tailored Cover Letter</div>
                          <div className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300">
                            {tailoredResults.coverLetter && (
                              <>
                                <p>Dear Hiring Team at {tailoredResults.coverLetter.company || 'Company'},</p>
                                <br />
                                <p>{tailoredResults.coverLetter.opener}. My core strengths include {tailoredResults.coverLetter.strength}, and I have hands-on experience with {tailoredResults.coverLetter.skills_str}.</p>
                                <br />
                                <p>{tailoredResults.coverLetter.hook}.</p>
                                <br />
                                <p>{tailoredResults.coverLetter.follow_up_note}</p>
                                <br />
                                <p>Sincerely,</p>
                                <p>{tailoredResults.coverLetter.candidate_name}</p>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">3. Outreach & LinkedIn Templates</div>
                          <div className="space-y-4">
                            <div>
                              <div className="font-bold text-[10px] text-gray-600 font-sans">COLD EMAIL DRAFT:</div>
                              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                                {tailoredResults.outreach.cold_email}
                              </pre>
                            </div>
                            <div>
                              <div className="font-bold text-[10px] text-gray-600 font-sans">LINKEDIN NOTE DRAFT:</div>
                              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                                {tailoredResults.outreach.linkedin_note}
                              </pre>
                            </div>
                            <div>
                              <div className="font-bold text-[10px] text-gray-600 font-sans">FOUNDER MESSAGE DRAFT:</div>
                              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                                {tailoredResults.outreach.founder_message}
                              </pre>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            className="win95-btn px-4 py-1.5 font-bold flex items-center justify-center"
                            onClick={handleDownloadPDF}
                          >
                            Download tailored PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}


        {/* 2. Start Menu Drawer */}
        {startMenuOpen && (
          <div className="win95-start-menu" onClick={(e) => e.stopPropagation()}>
            <div className="start-sidebar">
              <span className="sidebar-text">Windows95</span>
            </div>
            <div className="start-menu-items">
              <div 
                className="start-menu-item"
                onMouseEnter={() => setSubmenuOpen('programs')}
              >
                <span>📁 Programs</span>
                <span className="submenu-arrow">▶</span>
                
                {submenuOpen === 'programs' && (
                  <div className="start-submenu">
                    <div className="start-menu-item" onClick={() => { openWindow('about'); setStartMenuOpen(false); }}>💻 Archetype</div>
                    <div className="start-menu-item" onClick={() => { openWindow('resume'); setStartMenuOpen(false); }}>📝 Resume Details</div>
                    <div className="start-menu-item" onClick={() => { openWindow('projects'); setStartMenuOpen(false); }}>📁 Vector Profiles</div>
                    <div className="start-menu-item" onClick={() => { openWindow('dos'); setStartMenuOpen(false); }}>📟 MS-DOS Shell</div>
                    <div className="start-menu-item" onClick={() => { openWindow('cv_tailor'); setStartMenuOpen(false); }}>👔 CV Tailor</div>
                  </div>
                )}

              </div>
              <div 
                className="start-menu-item" 
                onMouseEnter={() => setSubmenuOpen(null)}
                onClick={() => { openWindow('about'); setStartMenuOpen(false); }}
              >
                <span>ℹ️ About</span>
              </div>
              <hr className="border-gray-400 my-1" />
              <div 
                className="start-menu-item"
                onClick={() => {
                  if (confirm('Initiate terminal shutdown sequence?')) {
                    router.push(`/dashboard/${id}`);
                  }
                }}
              >
                <span>🔌 Shut Down...</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Taskbar */}
        <div className="win95-taskbar" onClick={() => setStartMenuOpen(false)}>
          <button 
            className={`taskbar-btn ${startMenuOpen ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setStartMenuOpen(!startMenuOpen); }}
          >
            <Monitor className="w-4 h-4" /> Start
          </button>

          <div className="h-6 w-0.5 bg-gray-400 border border-white border-l-gray-700 border-t-gray-700 mx-2" />

          {/* Active Windows Buttons in Taskbar */}
          <div className="flex gap-2">
            {windows.map(w => {
              if (!w.isOpen) return null;
              const isActive = activeWindowId === w.id && !w.isMinimized;
              return (
                <button
                  key={w.id}
                  className={`taskbar-btn text-xs ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isActive) {
                      minimizeWindow(w.id);
                    } else {
                      focusWindow(w.id);
                    }
                  }}
                >
                  <span className="text-xs">{w.icon}</span>
                  <span className="hidden sm:inline font-mono text-[10px]">{w.title}</span>
                </button>
              );
            })}
          </div>

          {/* Clock */}
          <div className="win95-clock font-mono">
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
}
