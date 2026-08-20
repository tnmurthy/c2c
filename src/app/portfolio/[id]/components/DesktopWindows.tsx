import type { WindowState } from '../types';
import AboutWindow from './windows/AboutWindow';
import ResumeWindow from './windows/ResumeWindow';
import ProjectsWindow from './windows/ProjectsWindow';
import ScoresWindow from './windows/ScoresWindow';
import DosWindow from './windows/DosWindow';
import CvTailorWindow from './windows/CvTailorWindow';

interface DesktopWindowsProps {
  windows: WindowState[];
  activeWindowId: string | null;
  isMobile: boolean;
  onFocusWindow: (windowId: string) => void;
  onWindowMouseDown: (windowId: string, e: React.MouseEvent) => void;
  onMinimizeWindow: (windowId: string, e?: React.MouseEvent) => void;
  onMaximizeWindow: (windowId: string, e?: React.MouseEvent) => void;
  onCloseWindow: (windowId: string, e?: React.MouseEvent) => void;
  onOpenWindow: (windowId: string) => void;
  studentData: any;
  assessment: any;
  terminalHistory: string[];
  terminalInput: string;
  onTerminalInputChange: (value: string) => void;
  onTerminalSubmit: (e: React.FormEvent) => void;
  alerts: any[];
  selectedLeadId: string;
  jobDescription: string;
  isCustomJd: boolean;
  tailorLoading: boolean;
  tailoredResults: any;
  onLeadChange: (leadId: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onTailorCV: () => void;
  onDownloadPDF: () => void;
}

export default function DesktopWindows({
  windows,
  activeWindowId,
  isMobile,
  onFocusWindow,
  onWindowMouseDown,
  onMinimizeWindow,
  onMaximizeWindow,
  onCloseWindow,
  onOpenWindow,
  studentData,
  assessment,
  terminalHistory,
  terminalInput,
  onTerminalInputChange,
  onTerminalSubmit,
  alerts,
  selectedLeadId,
  jobDescription,
  isCustomJd,
  tailorLoading,
  tailoredResults,
  onLeadChange,
  onJobDescriptionChange,
  onTailorCV,
  onDownloadPDF,
}: DesktopWindowsProps) {
  return (
    <>
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
            onClick={() => onFocusWindow(w.id)}
          >
            {/* Window Header */}
            <div
              className={`win95-title-bar ${isWindowActive ? '' : 'inactive'}`}
              onMouseDown={(e) => onWindowMouseDown(w.id, e)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{w.icon}</span>
                <span className="win95-title">{w.title}</span>
              </div>
              <div className="win95-title-controls" onMouseDown={(e) => e.stopPropagation()}>
                <button className="win95-btn" onClick={(e) => onMinimizeWindow(w.id, e)} aria-label="Minimize">_</button>
                <button className="win95-btn" onClick={(e) => onMaximizeWindow(w.id, e)} aria-label="Maximize">□</button>
                <button className="win95-btn" onClick={(e) => onCloseWindow(w.id, e)} aria-label="Close">X</button>
              </div>
            </div>

            {/* Window Content */}
            <div className="win95-body">
              {w.id === 'about' && (
                <AboutWindow
                  studentData={studentData}
                  assessment={assessment}
                  onOpenResume={() => onOpenWindow('resume')}
                />
              )}

              {w.id === 'resume' && (
                <ResumeWindow studentData={studentData} assessment={assessment} />
              )}

              {w.id === 'projects' && (
                <ProjectsWindow
                  assessment={assessment}
                  onOpenScores={() => onOpenWindow('scores')}
                />
              )}

              {w.id === 'scores' && (
                <ScoresWindow assessment={assessment} />
              )}

              {w.id === 'dos' && (
                <DosWindow
                  terminalHistory={terminalHistory}
                  terminalInput={terminalInput}
                  onTerminalInputChange={onTerminalInputChange}
                  onTerminalSubmit={onTerminalSubmit}
                />
              )}

              {w.id === 'cv_tailor' && (
                <CvTailorWindow
                  alerts={alerts}
                  selectedLeadId={selectedLeadId}
                  jobDescription={jobDescription}
                  isCustomJd={isCustomJd}
                  tailorLoading={tailorLoading}
                  tailoredResults={tailoredResults}
                  onLeadChange={onLeadChange}
                  onJobDescriptionChange={onJobDescriptionChange}
                  onTailorCV={onTailorCV}
                  onDownloadPDF={onDownloadPDF}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
