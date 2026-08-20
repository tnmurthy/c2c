'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import GlobalRetroStyles from './components/GlobalRetroStyles';
import BootScreen from './components/BootScreen';
import DesktopShortcuts from './components/DesktopShortcuts';
import MobileAppMenu from './components/MobileAppMenu';
import DesktopWindows from './components/DesktopWindows';
import StartMenu from './components/StartMenu';
import Taskbar from './components/Taskbar';
import { useWindowManager } from './hooks/useWindowManager';
import { useCvTailor } from './hooks/useCvTailor';
import { useTerminal } from './hooks/useTerminal';

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

  const {
    windows,
    activeWindowId,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    handleMouseDown,
  } = useWindowManager(isMobile);

  const {
    terminalInput,
    setTerminalInput,
    terminalHistory,
    handleTerminalSubmit,
  } = useTerminal(studentData, assessment, () => closeWindow('dos'));

  const {
    alerts,
    selectedLeadId,
    jobDescription,
    setJobDescription,
    isCustomJd,
    tailorLoading,
    tailoredResults,
    handleLeadChange,
    handleTailorCV,
    handleDownloadPDF,
  } = useCvTailor(id, studentData, assessment);

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
      {booting && <BootScreen bootProgress={bootProgress} />}

      {/* Retro CSS Styles injected locally */}
      <GlobalRetroStyles />

      {/* Main retro desktop area */}
      <div className="retro-win95-desktop">
        {/* Desktop shortcuts */}
        {!isMobile && <DesktopShortcuts onOpenWindow={openWindow} />}

        {/* Mobile DOS Menu program selector */}
        {isMobile && <MobileAppMenu onOpenWindow={openWindow} />}

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
        <DesktopWindows
          windows={windows}
          activeWindowId={activeWindowId}
          isMobile={isMobile}
          onFocusWindow={focusWindow}
          onWindowMouseDown={handleMouseDown}
          onMinimizeWindow={minimizeWindow}
          onMaximizeWindow={maximizeWindow}
          onCloseWindow={closeWindow}
          onOpenWindow={openWindow}
          studentData={studentData}
          assessment={assessment}
          terminalHistory={terminalHistory}
          terminalInput={terminalInput}
          onTerminalInputChange={setTerminalInput}
          onTerminalSubmit={handleTerminalSubmit}
          alerts={alerts}
          selectedLeadId={selectedLeadId}
          jobDescription={jobDescription}
          isCustomJd={isCustomJd}
          tailorLoading={tailorLoading}
          tailoredResults={tailoredResults}
          onLeadChange={handleLeadChange}
          onJobDescriptionChange={setJobDescription}
          onTailorCV={handleTailorCV}
          onDownloadPDF={handleDownloadPDF}
        />

        {/* 2. Start Menu Drawer */}
        {startMenuOpen && (
          <StartMenu
            submenuOpen={submenuOpen}
            onSubmenuChange={setSubmenuOpen}
            onOpenWindow={openWindow}
            onCloseStartMenu={() => setStartMenuOpen(false)}
            onShutdown={() => router.push(`/dashboard/${id}`)}
          />
        )}

        {/* 3. Taskbar */}
        <Taskbar
          startMenuOpen={startMenuOpen}
          onCloseStartMenu={() => setStartMenuOpen(false)}
          onToggleStartMenu={() => setStartMenuOpen(!startMenuOpen)}
          windows={windows}
          activeWindowId={activeWindowId}
          onMinimizeWindow={minimizeWindow}
          onFocusWindow={focusWindow}
          timeStr={timeStr}
        />
      </div>
    </div>
  );
}
