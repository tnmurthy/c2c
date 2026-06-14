let zIndex = 100;
let openWindows = {};
let selectedTheme = 'classic';

// Ensure projects have folder property set correctly
projects.forEach(p => {
    if (folderMappings[p.id]) {
        p.folder = folderMappings[p.id];
    }
});

const SOUNDS = {
    startup: 'https://win95-portfolio.vercel.app/sounds/startup.wav',
    shutdown: 'https://win95-portfolio.vercel.app/sounds/shutdown.wav',
    click: 'https://win95-portfolio.vercel.app/sounds/click.wav',
    error: 'https://win95-portfolio.vercel.app/sounds/error.wav',
    minimize: 'https://win95-portfolio.vercel.app/sounds/minimize.wav',
    maximize: 'https://win95-portfolio.vercel.app/sounds/maximize.wav',
    open: 'https://win95-portfolio.vercel.app/sounds/open.wav',
    close: 'https://win95-portfolio.vercel.app/sounds/close.wav'
};

function playSound(name) {
    const audio = new Audio(SOUNDS[name]);
    audio.play().catch(e => console.log('Audio playback blocked until user interaction'));
}

async function init() {
    console.log("Initializing Portfolio...");
    // Load saved theme
    const savedTheme = localStorage.getItem('win95-theme') || 'classic';
    selectedTheme = savedTheme;
    applyTheme();

    handleBootSequence();
    
    // Render initially with hardcoded projects
    renderDesktopIcons();
    updateClock();
    setInterval(updateClock, 1000);

    // Init Clippy
    initClippy();

    // Init Phase 3
    initContextMenu();
    initMarqueeSelection();

    // Sync with GitHub in the background
    syncGitHubProjects().then(() => {
        console.log("GitHub sync complete, re-rendering icons.");
        renderDesktopIcons();
    });
}

async function syncGitHubProjects() {
    try {
        const response = await fetch('https://api.github.com/users/tnmurthy/repos?per_page=100&sort=updated');
        if (!response.ok) throw new Error('GitHub API failure');
        
        const repos = await response.json();
        
        repos.forEach(repo => {
            if (!projects.find(p => p.id === repo.name)) {
                const newProject = {
                    id: repo.name,
                    title: repo.name,
                    icon: repo.language === 'Python' ? ICONS.brain : (repo.language === 'TypeScript' || repo.language === 'JavaScript' ? ICONS.robot : ICONS.folder),
                    tooltip: repo.description || 'GitHub Repository',
                    content: `<h3>${repo.name}</h3>
                    <p>${repo.description || 'No description available.'}</p>
                    <p><strong>Stack:</strong> ${repo.language || 'Various'}</p>
                    <button class="btn-win95" onclick="window.open('${repo.html_url}', '_blank')">View Code</button>`,
                    folder: 'other-projects'
                };
                
                const nameLower = repo.name.toLowerCase();
                const descLower = (repo.description || '').toLowerCase();
                
                if (nameLower.includes('agent') || descLower.includes('agent')) {
                    newProject.folder = 'agentic';
                    newProject.icon = ICONS.robot;
                } else if (nameLower.includes('data') || descLower.includes('data') || descLower.includes('lineage')) {
                    newProject.folder = 'data-governance';
                    newProject.icon = ICONS.database;
                } else if (nameLower.includes('fin') || nameLower.includes('market') || descLower.includes('trading')) {
                    newProject.folder = 'fintech';
                    newProject.icon = ICONS.finance;
                }
                
                projects.push(newProject);
                if (!folderMappings[repo.name]) {
                    folderMappings[repo.name] = newProject.folder;
                }
            }
        });
    } catch (error) {
        console.error('Failed to sync with GitHub:', error);
    }
}

function handleBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const startupSound = new Audio(SOUNDS.startup);

    setTimeout(() => {
        bootScreen.classList.add('fade-out');
        document.body.classList.add('booted');

        const playSoundInit = () => {
            startupSound.play().catch(e => console.log('Audio wait for interaction'));
            document.removeEventListener('click', playSoundInit);
            document.removeEventListener('mousedown', playSoundInit);
        };
        document.addEventListener('click', playSoundInit);
        document.addEventListener('mousedown', playSoundInit);
    }, 3000);
}

function renderDesktopIcons() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    desktop.innerHTML = '';
    
    desktopItems.forEach(item => {
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.id = `desktop-icon-${item.id}`;

        icon.onclick = (e) => {
            e.stopPropagation();
            if (icon.classList.contains('selected')) {
                openWindow(item.id);
            } else {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
            }
        };

        icon.ondblclick = (e) => {
            e.stopPropagation();
            openWindow(item.id);
        };

        const displayTitle = item.title.length > 15 ? item.title.substring(0, 12) + '...' : item.title;

        icon.innerHTML = `
            <img src="${item.icon}" alt="${item.title}">
            <span>${displayTitle}</span>
            <div class="tooltip">${item.tooltip || 'Open'} (Double-click to open)</div>
        `;
        desktop.appendChild(icon);
    });
}

function makeResizable(element) {
    const resizers = element.querySelectorAll('.resizer');
    let isResizing = false;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            let startX = e.clientX;
            let startY = e.clientY;
            let startWidth = element.offsetWidth;
            let startHeight = element.offsetHeight;

            function onMouseMove(e) {
                if (!isResizing) return;
                
                if (resizer.classList.contains('resizer-r')) {
                    const newWidth = startWidth + e.clientX - startX;
                    if (newWidth > 200) element.style.width = `${newWidth}px`;
                } else if (resizer.classList.contains('resizer-b')) {
                    const newHeight = startHeight + e.clientY - startY;
                    if (newHeight > 150) element.style.height = `${newHeight}px`;
                } else if (resizer.classList.contains('resizer-rb')) {
                    const newWidth = startWidth + e.clientX - startX;
                    const newHeight = startHeight + e.clientY - startY;
                    if (newWidth > 200) element.style.width = `${newWidth}px`;
                    if (newHeight > 150) element.style.height = `${newHeight}px`;
                }
            }

            function onMouseUp() {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });
    });
}

function openWindow(id) {
    if (openWindows[id]) {
        bringToFront(openWindows[id]);
        if (openWindows[id].style.display === 'none') {
            openWindows[id].style.display = 'flex';
        }
        return;
    }

    let folder = null;
    if (id === 'agentic') folder = { id: 'agentic', title: 'GenAI & Agentic Systems', icon: ICONS.brain };
    else if (id === 'fintech') folder = { id: 'fintech', title: 'FinTech & Bloomberg', icon: ICONS.finance };
    else if (id === 'data-governance') folder = { id: 'data-governance', title: 'Data & Governance', icon: ICONS.database };
    else if (id === 'product-management') folder = { id: 'product-management', title: 'Product Owner', icon: ICONS.product };
    else if (id === 'other-projects') folder = { id: 'other-projects', title: 'Other Projects', icon: ICONS.folder };

    let project;
    if (folder) {
        let folderContentHTML = `<div class="folder-grid">`;
        const folderProjects = projects.filter(p => p.folder === id);
        folderProjects.forEach(p => {
            const displayTitle = p.title.length > 15 ? p.title.substring(0, 12) + '...' : p.title;
            folderContentHTML += `
                <div class="desktop-icon" onclick="selectFolderIcon(event, '${p.id}', this)" ondblclick="openWindow('${p.id}')">
                    <img src="${p.icon}" alt="${p.title}">
                    <span>${displayTitle}</span>
                    <div class="tooltip">${p.tooltip || 'Visit Site'} (Double-click to open)</div>
                </div>
            `;
        });
        folderContentHTML += `</div>`;
        
        project = { id: folder.id, title: folder.title, icon: folder.icon, content: folderContentHTML };
    } else if (id === 'display-properties') {
        project = getDisplayPropertiesProject();
    } else if (id === 'dos') {
        project = {
            id: 'dos',
            title: 'MS-DOS Prompt',
            icon: ICONS.terminal,
            content: `
                <div class="dos-container" style="background: black; color: #c0c0c0; font-family: 'Consolas', 'Courier New', monospace; padding: 10px; height: 100%; overflow-y: auto; font-size: 14px;">
                    <div id="dos-output">Microsoft(R) Windows 95<br>(C)Copyright Microsoft Corp 1981-1995.<br><br>C:\\WINDOWS> </div>
                    <div style="display: flex;"><span>&nbsp;</span><input type="text" id="dos-input" style="background: transparent; border: none; color: #c0c0c0; font-family: inherit; font-size: inherit; outline: none; width: 100%;" autofocus></div>
                </div>
            `
        };
    } else {
        project = projects.find(p => p.id === id) || (id === 'about' ? aboutMeContent : null);
    }

    if (!project) return;

    const template = document.getElementById('window-template');
    const clone = template.content.cloneNode(true);
    const windowEl = clone.querySelector('.window');

    windowEl.querySelector('.window-title').textContent = project.title;
    windowEl.querySelector('.window-icon').src = project.icon;
    windowEl.querySelector('.window-body').innerHTML = project.content;

    const offset = Object.keys(openWindows).length * 20 + 50;
    windowEl.style.top = `${offset}px`;
    windowEl.style.left = `${offset}px`;
    windowEl.style.zIndex = ++zIndex;

    windowEl.querySelector('.close-btn').onclick = () => closeWindow(id, windowEl);
    windowEl.querySelector('.minimize-btn').onclick = () => toggleMinimize(id, windowEl);
    windowEl.querySelector('.maximize-btn').onclick = () => toggleMaximize(windowEl);
    
    const titleBar = windowEl.querySelector('.title-bar');
    titleBar.ondblclick = (e) => {
        if (e.target.closest('.title-bar-controls')) return;
        toggleMaximize(windowEl);
    };

    windowEl.addEventListener('mousedown', () => bringToFront(windowEl));
    bringToFront(windowEl);
    makeDraggable(windowEl);
    makeResizable(windowEl);

    document.body.appendChild(windowEl);
    openWindows[id] = windowEl;
    addToTaskbar(id, project);

    if (id === 'dos') {
        const input = windowEl.querySelector('#dos-input');
        const output = windowEl.querySelector('#dos-output');
        input.focus();
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim().toLowerCase();
                output.innerHTML += cmd + '<br>';
                handleDOSCommand(cmd, output);
                input.value = '';
                windowEl.querySelector('.dos-container').scrollTop = windowEl.querySelector('.dos-container').scrollHeight;
            }
        };
    }

    if (window.clippy) window.clippy.speak(`Opening ${project.title}...`);
    playSound('open');
}

function handleDOSCommand(cmd, output) {
    if (cmd === 'help') {
        output.innerHTML += 'Available commands: HELP, DIR, VER, WHOAMI, CLS, EXIT, PROJECTS<br>';
    } else if (cmd === 'dir') {
        output.innerHTML += ' Directory of C:\\WINDOWS<br><br>. &lt;DIR&gt;<br>.. &lt;DIR&gt;<br>PROJECTS &lt;DIR&gt;<br>README TXT 1,234<br><br>';
    } else if (cmd === 'ver') {
        output.innerHTML += 'Microsoft Windows 95 [Version 4.00.950]<br>';
    } else if (cmd === 'whoami') {
        output.innerHTML += 'Guest User<br>';
    } else if (cmd === 'cls') {
        output.innerHTML = 'C:\\WINDOWS> ';
        return;
    } else if (cmd === 'projects') {
        projects.forEach(p => { output.innerHTML += `- ${p.title}<br>`; });
    } else if (cmd === 'exit') {
        closeWindow('dos', openWindows['dos']);
    } else if (cmd !== '') {
        output.innerHTML += `Bad command or file name: ${cmd}<br>`;
    }
    output.innerHTML += '<br>C:\\WINDOWS> ';
}

function closeWindow(id, element) {
    element.remove();
    delete openWindows[id];
    removeFromTaskbar(id);
    playSound('close');
}

function bringToFront(element) {
    document.querySelectorAll('.window').forEach(win => {
        win.classList.remove('active');
        win.classList.add('inactive');
    });
    element.classList.remove('inactive');
    element.classList.add('active');
    element.style.zIndex = ++zIndex;

    const id = Object.keys(openWindows).find(key => openWindows[key] === element);
    if (id) {
        document.querySelectorAll('.taskbar-item').forEach(item => item.classList.remove('active'));
        const taskItem = document.getElementById(`taskbar-${id}`);
        if (taskItem) taskItem.classList.add('active');
    }
}

function toggleMaximize(element) { element.classList.toggle('maximized'); }

function toggleMinimize(id, element) {
    element.style.display = 'none';
    const taskItem = document.getElementById(`taskbar-${id}`);
    if (taskItem) taskItem.classList.remove('active');
}

function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    const btn = document.getElementById('start-button');
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
        btn.classList.remove('active');
        hideAllSubmenus();
    } else {
        menu.style.display = 'flex';
        btn.classList.add('active');
    }
}

function showPrograms() {
    hideAllSubmenus();
    document.getElementById('programs-submenu').style.display = 'flex';
}

function showSettings() {
    hideAllSubmenus();
    const submenu = document.getElementById('settings-submenu');
    if (submenu) submenu.style.display = 'flex';
}

function hideAllSubmenus() {
    const progSub = document.getElementById('programs-submenu');
    if (progSub) progSub.style.display = 'none';
    const settSub = document.getElementById('settings-submenu');
    if (settSub) settSub.style.display = 'none';
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('start-menu');
    const btn = document.getElementById('start-button');
    if (!menu.contains(e.target) && !btn.contains(e.target) && menu.style.display === 'flex') {
        toggleStartMenu();
    }
});

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addToTaskbar(id, project) {
    const taskbarItems = document.getElementById('taskbar-items');
    const item = document.createElement('div');
    item.className = 'taskbar-item btn-win95 active';
    item.id = `taskbar-${id}`;
    item.innerHTML = `<img src="${project.icon}" width="16"> ${project.title}`;
    item.onclick = () => {
        const win = openWindows[id];
        if (win) {
            if (win.style.display === 'none') {
                win.style.display = 'flex';
                bringToFront(win);
            } else if (win.classList.contains('active')) {
                toggleMinimize(id, win);
            } else {
                bringToFront(win);
            }
        }
    };
    taskbarItems.appendChild(item);
}

function removeFromTaskbar(id) {
    const item = document.getElementById(`taskbar-${id}`);
    if (item) item.remove();
}

function makeDraggable(element) {
    const titleBar = element.querySelector('.title-bar');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    titleBar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.title-bar-controls')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        bringToFront(element);

        const onMouseMove = (e) => {
            if (!isDragging) return;
            element.style.left = `${initialLeft + e.clientX - startX}px`;
            element.style.top = `${initialTop + e.clientY - startY}px`;
        };
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

class Clippy {
    constructor() {
        this.el = document.createElement('div');
        this.el.id = 'clippy';
        this.el.style.backgroundImage = `url('${ICONS.clippy}')`;
        this.bubble = document.createElement('div');
        this.bubble.className = 'clippy-bubble';
        this.bubble.textContent = "Hi! I'm Clippy.";
        document.body.appendChild(this.el);
        document.body.appendChild(this.bubble);
        this.el.onclick = () => this.randomTip();
        setTimeout(() => this.showBubble(), 1000);
        setTimeout(() => this.hideBubble(), 6000);
        this.tips = ["Double-click an icon!", "Try the MS-DOS prompt.", "You can resize windows!"];
    }
    speak(text) { this.bubble.textContent = text; this.showBubble(); setTimeout(() => this.hideBubble(), 4000); }
    showBubble() { this.bubble.style.display = 'block'; }
    hideBubble() { this.bubble.style.display = 'none'; }
    randomTip() { this.speak(this.tips[Math.floor(Math.random() * this.tips.length)]); }
}

function initClippy() { window.clippy = new Clippy(); }

function initContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.innerHTML = `<div class="context-menu-item" onclick="location.reload()">Refresh</div>`;
    document.body.appendChild(menu);
    document.addEventListener('contextmenu', (e) => {
        if (e.target.id === 'desktop' || e.target.closest('#desktop') || e.target === document.body) {
            e.preventDefault();
            menu.style.display = 'block';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
        }
    });
    document.addEventListener('click', () => { menu.style.display = 'none'; });
}

function initMarqueeSelection() {
    const desktop = document.getElementById('desktop');
    const marquee = document.createElement('div');
    marquee.id = 'selection-marquee';
    desktop.appendChild(marquee);
    let startX, startY, isSelecting = false;
    desktop.addEventListener('mousedown', (e) => {
        if (e.target !== desktop) return;
        isSelecting = true;
        startX = e.clientX; startY = e.clientY;
        marquee.style.display = 'block';
        document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
        const onMouseMove = (e) => {
            if (!isSelecting) return;
            const left = Math.min(startX, e.clientX); const top = Math.min(startY, e.clientY);
            const width = Math.abs(e.clientX - startX); const height = Math.abs(e.clientY - startY);
            marquee.style.left = `${left}px`; marquee.style.top = `${top}px`;
            marquee.style.width = `${width}px`; marquee.style.height = `${height}px`;
        };
        const onMouseUp = () => { isSelecting = false; marquee.style.display = 'none'; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function selectFolderIcon(event, id, el) {
    event.stopPropagation();
    if (el.classList.contains('selected')) { openWindow(id); }
    else { el.parentNode.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected')); el.classList.add('selected'); }
}

function applyTheme() {
    localStorage.setItem('win95-theme', selectedTheme);
    document.body.className = '';
    if (selectedTheme !== 'classic') document.body.classList.add(`theme-${selectedTheme}`);
}

function openDisplayProperties() { selectedTheme = localStorage.getItem('win95-theme') || 'classic'; openWindow('display-properties'); }

function getDisplayPropertiesProject() {
    return {
        id: 'display-properties',
        title: 'Display Properties',
        icon: 'https://win98icons.alexmeub.com/icons/png/display_properties-2.png',
        content: `<div style="color: black;"><h3>Display Properties</h3><button class="btn-win95" onclick="applyTheme(); closeWindow('display-properties', this.closest('.window'))">OK</button></div>`
    };
}

document.addEventListener('DOMContentLoaded', init);
