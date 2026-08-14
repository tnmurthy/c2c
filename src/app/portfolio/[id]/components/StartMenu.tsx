interface StartMenuProps {
  submenuOpen: string | null;
  onSubmenuChange: (submenu: string | null) => void;
  onOpenWindow: (windowId: string) => void;
  onCloseStartMenu: () => void;
  onShutdown: () => void;
}

export default function StartMenu({
  submenuOpen,
  onSubmenuChange,
  onOpenWindow,
  onCloseStartMenu,
  onShutdown,
}: StartMenuProps) {
  return (
    <div className="win95-start-menu" onClick={(e) => e.stopPropagation()}>
      <div className="start-sidebar">
        <span className="sidebar-text">Windows95</span>
      </div>
      <div className="start-menu-items">
        <div
          className="start-menu-item"
          onMouseEnter={() => onSubmenuChange('programs')}
        >
          <span>📁 Programs</span>
          <span className="submenu-arrow">▶</span>

          {submenuOpen === 'programs' && (
            <div className="start-submenu">
              <div className="start-menu-item" onClick={() => { onOpenWindow('about'); onCloseStartMenu(); }}>💻 Archetype</div>
              <div className="start-menu-item" onClick={() => { onOpenWindow('resume'); onCloseStartMenu(); }}>📝 Resume Details</div>
              <div className="start-menu-item" onClick={() => { onOpenWindow('projects'); onCloseStartMenu(); }}>📁 Vector Profiles</div>
              <div className="start-menu-item" onClick={() => { onOpenWindow('dos'); onCloseStartMenu(); }}>📟 MS-DOS Shell</div>
              <div className="start-menu-item" onClick={() => { onOpenWindow('cv_tailor'); onCloseStartMenu(); }}>👔 CV Tailor</div>
            </div>
          )}

        </div>
        <div
          className="start-menu-item"
          onMouseEnter={() => onSubmenuChange(null)}
          onClick={() => { onOpenWindow('about'); onCloseStartMenu(); }}
        >
          <span>ℹ️ About</span>
        </div>
        <hr className="border-gray-400 my-1" />
        <div
          className="start-menu-item"
          onClick={() => {
            if (confirm('Initiate terminal shutdown sequence?')) {
              onShutdown();
            }
          }}
        >
          <span>🔌 Shut Down...</span>
        </div>
      </div>
    </div>
  );
}
