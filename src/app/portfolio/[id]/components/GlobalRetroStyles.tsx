export default function GlobalRetroStyles() {
  return (
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
  );
}
