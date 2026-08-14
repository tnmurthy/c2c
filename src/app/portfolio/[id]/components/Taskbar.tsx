import { Monitor } from 'lucide-react';
import type { WindowState } from '../types';

interface TaskbarProps {
  startMenuOpen: boolean;
  onCloseStartMenu: () => void;
  onToggleStartMenu: () => void;
  windows: WindowState[];
  activeWindowId: string | null;
  onMinimizeWindow: (windowId: string) => void;
  onFocusWindow: (windowId: string) => void;
  timeStr: string;
}

export default function Taskbar({
  startMenuOpen,
  onCloseStartMenu,
  onToggleStartMenu,
  windows,
  activeWindowId,
  onMinimizeWindow,
  onFocusWindow,
  timeStr,
}: TaskbarProps) {
  return (
    <div className="win95-taskbar" onClick={onCloseStartMenu}>
      <button
        className={`taskbar-btn ${startMenuOpen ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleStartMenu(); }}
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
                  onMinimizeWindow(w.id);
                } else {
                  onFocusWindow(w.id);
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
  );
}
