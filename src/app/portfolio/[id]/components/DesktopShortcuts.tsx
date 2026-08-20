interface DesktopShortcutsProps {
  onOpenWindow: (windowId: string) => void;
}

export default function DesktopShortcuts({ onOpenWindow }: DesktopShortcutsProps) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2">
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('about')}>
        <span className="desktop-shortcut-icon">💻</span>
        <span className="desktop-shortcut-label">My Computer</span>
      </div>
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('resume')}>
        <span className="desktop-shortcut-icon">📝</span>
        <span className="desktop-shortcut-label">My Resume</span>
      </div>
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('projects')}>
        <span className="desktop-shortcut-icon">📁</span>
        <span className="desktop-shortcut-label">Competencies</span>
      </div>
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('scores')}>
        <span className="desktop-shortcut-icon">📊</span>
        <span className="desktop-shortcut-label">CogMatrix</span>
      </div>
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('dos')}>
        <span className="desktop-shortcut-icon">📟</span>
        <span className="desktop-shortcut-label">MS-DOS Prompt</span>
      </div>
      <div className="desktop-shortcut" onDoubleClick={() => onOpenWindow('cv_tailor')}>
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
  );
}
