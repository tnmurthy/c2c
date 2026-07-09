const ICONS = {
    computer: 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png',
    folder: 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png',
    text: 'https://win98icons.alexmeub.com/icons/png/notepad-5.png',
    clippy: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M30%2090%20V40%20A10%2010%200%201%201%2050%2040%20V80%20A10%2010%200%201%200%2070%2080%20V30%22%20stroke%3D%22%23808080%22%20fill%3D%22none%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2230%22%20r%3D%223%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2265%22%20cy%3D%2230%22%20r%3D%223%22%20fill%3D%22black%22%2F%3E%3Cpath%20d%3D%22M30%2020%20Q40%2015%2050%2020%22%20stroke%3D%22black%22%20fill%3D%22none%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M50%2020%20Q60%2015%2070%2020%22%20stroke%3D%22black%22%20fill%3D%22none%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E',
    video: 'https://win98icons.alexmeub.com/icons/png/media_player-0.png',
    gear: 'https://win98icons.alexmeub.com/icons/png/settings_gear-3.png',
    msn: 'https://win98icons.alexmeub.com/icons/png/msn.png',
    chart: 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
    html: 'https://win98icons.alexmeub.com/icons/png/html-1.png',
    world: 'https://win98icons.alexmeub.com/icons/png/world-0.png',
    network: 'https://win98icons.alexmeub.com/icons/png/world_network_directories-3.png',
    camera: 'https://win98icons.alexmeub.com/icons/png/camera-0.png',
    certificate: 'https://win98icons.alexmeub.com/icons/png/certificate-0.png',
    brain: 'https://win98icons.alexmeub.com/icons/png/entire_network_globe-3.png',
    robot: 'https://win98icons.alexmeub.com/icons/png/computer_gear.png',
    product: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png',
    strategy: 'https://win98icons.alexmeub.com/icons/png/check-0.png',
    linkedin: 'https://win98icons.alexmeub.com/icons/png/msie1-2.png',
    resume: 'https://win98icons.alexmeub.com/icons/png/notepad-4.png',
    briefcase: 'https://win98icons.alexmeub.com/icons/png/briefcase-0.png',
    book: 'https://win98icons.alexmeub.com/icons/png/help_book_big-0.png',
    database: 'https://win98icons.alexmeub.com/icons/png/cylinder_database-1.png',
    shield: 'https://win98icons.alexmeub.com/icons/png/key_padlock-0.png',
    search: 'https://win98icons.alexmeub.com/icons/png/search_file-0.png',
    finance: 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
    terminal: 'https://win98icons.alexmeub.com/icons/png/ms_dos-0.png',
    pipe: 'https://win98icons.alexmeub.com/icons/png/recycle_bin_full-4.png'
};

const projects = [
    {
        id: 'justhireme',
        title: 'JustHireMe',
        icon: ICONS.gear,
        tooltip: 'JustHireMe',
        content: `<h3>JustHireMe</h3><p>Local-first autonomous job application engine.</p><p><strong>Stack:</strong> Tauri, React, Python, FastAPI, Kùzu</p>`
    },
    {
        id: 'resume',
        title: 'My Resume',
        icon: ICONS.resume,
        tooltip: 'CV & Experience',
        content: `<h3>Your Full Name - Resume</h3>
        <hr>
        <p><strong>Roles:</strong> Python, React, FastAPI</p>
        <hr>
        <p><strong>Summary:</strong> 2–4 sentence professional summary.</p>
        <hr>
        <p><strong>Expertise:</strong></p>
        <ul><li>Python</li><li>React</li><li>FastAPI</li></ul>`
    }
];

const aboutMeContent = {
    id: 'about',
    title: 'About Me',
    icon: ICONS.computer,
    content: `<h3>Your Full Name</h3>
    <p><strong>Python · React · FastAPI</strong></p>
    <hr>
    <p>2–4 sentence professional summary.</p>
    <button class="btn-win95" onclick="window.open('https://linkedin.com/in/yourhandle', '_blank')">LinkedIn Profile</button>
    <button class="btn-win95" onclick="window.open('https://github.com/yourhandle', '_blank')">GitHub</button>`
};

const folderMappings = {
    'justhireme': 'featured',
};

const desktopItems = [
    { id: 'featured', title: 'Featured Work', icon: ICONS.folder, isFolder: true, tooltip: 'Featured Work' },
    { id: 'dos', title: 'MS-DOS Prompt', icon: ICONS.terminal, isFolder: false, tooltip: 'Command line interface' },
    { id: 'resume', title: 'My Resume', icon: ICONS.resume, isFolder: false, tooltip: 'CV & Core Competencies' },
    { id: 'linkedin', title: 'LinkedIn Profile', icon: ICONS.linkedin, isFolder: false, tooltip: 'Connect with me' }
];
