import { useEffect, useRef, useState } from 'react';
import type { WindowState } from '../types';

const INITIAL_WINDOWS: WindowState[] = [
  { id: 'about', title: 'About Candidate', icon: '💻', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 50, y: 50, width: 450, height: 300 },
  { id: 'resume', title: 'My Resume', icon: '📝', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 100, y: 80, width: 450, height: 380 },
  { id: 'projects', title: 'Competency Vectors', icon: '📁', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 150, y: 110, width: 400, height: 280 },
  { id: 'dos', title: 'MS-DOS Prompt', icon: '📟', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 80, y: 120, width: 500, height: 350 },
  { id: 'scores', title: 'Cognitive Matrix', icon: '📊', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 200, y: 150, width: 400, height: 320 },
  { id: 'cv_tailor', title: 'CV Tailor', icon: '👔', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 220, y: 180, width: 550, height: 480 },
];

/**
 * Owns Win95-style window chrome state: open/close/minimize/maximize,
 * z-index stacking, focus, and drag-to-move behavior.
 */
export function useWindowManager(isMobile: boolean) {
  const [windows, setWindows] = useState<WindowState[]>(INITIAL_WINDOWS);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(10);

  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  return {
    windows,
    activeWindowId,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    handleMouseDown,
  };
}
