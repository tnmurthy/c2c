import json
import os

def generate_projects_js(portfolio_data):
    """
    Unit 3: Portfolio Auto-Generator.
    Converts refined candidate data into a functional projects.js for brand-optimizer.
    """
    
    # Header and Icons (hardcoded from original projects.js for consistency)
    js_content = """const ICONS = {
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
"""

    # Generate Project Objects
    for proj in portfolio_data['projects']:
        content = f"<h3>{proj['title']}</h3><p>{proj['impact']}</p>"
        if 'stack' in proj:
            content += f"<p><strong>Stack:</strong> {proj['stack']}</p>"
        if 'url' in proj:
            content += f'<button class="btn-win95" onclick="window.open(\'{proj["url"]}\', \'_blank\')">Visit Site</button>'
        if 'repo' in proj:
            content += f'<button class="btn-win95" onclick="window.open(\'{proj["repo"]}\', \'_blank\')">View Code</button>'
            
        js_content += f"""    {{
        id: '{proj["id"]}',
        title: '{proj["title"]}',
        icon: ICONS.{proj["icon"]},
        tooltip: '{proj.get("tooltip", proj["title"])}',
        content: `{content}`
    }},
"""
    
    # Resume Item
    cand = portfolio_data['candidate']
    roles_html = "".join([f"<li>{role}</li>" for role in cand['roles']])
    js_content += f"""    {{
        id: 'resume',
        title: 'My Resume',
        icon: ICONS.resume,
        tooltip: 'CV & Experience',
        content: `<h3>{cand['name']} - Resume</h3>
        <hr>
        <p><strong>Roles:</strong> {', '.join(cand['roles'])}</p>
        <hr>
        <p><strong>Summary:</strong> {cand['summary']}</p>
        <hr>
        <p><strong>Expertise:</strong></p>
        <ul>{roles_html}</ul>`
    }}
];
"""

    # About Me Item
    js_content += f"""
const aboutMeContent = {{
    id: 'about',
    title: 'About Me',
    icon: ICONS.computer,
    content: `<h3>{cand['name']}</h3>
    <p><strong>{ " · ".join(cand['roles']) }</strong></p>
    <hr>
    <p>{cand['summary']}</p>
    <button class="btn-win95" onclick="window.open('{cand.get('linkedin', '#')}', '_blank')">LinkedIn Profile</button>
    <button class="btn-win95" onclick="window.open('{cand.get('github', '#')}', '_blank')">GitHub</button>`
}};
"""

    # Folder Mappings
    js_content += "\nconst folderMappings = {\n"
    for proj in portfolio_data['projects']:
        if 'folder' in proj:
            js_content += f"    '{proj['id']}': '{proj['folder']}',\n"
    js_content += "};\n"

    # Desktop Items
    js_content += "\nconst desktopItems = [\n"
    for folder in portfolio_data['folders']:
        js_content += f"    {{ id: '{folder['id']}', title: '{folder['title']}', icon: ICONS.{folder['icon']}, isFolder: true, tooltip: '{folder.get('tooltip', folder['title'])}' }},\n"
    
    js_content += """    { id: 'dos', title: 'MS-DOS Prompt', icon: ICONS.terminal, isFolder: false, tooltip: 'Command line interface' },
    { id: 'resume', title: 'My Resume', icon: ICONS.resume, isFolder: false, tooltip: 'CV & Core Competencies' },
    { id: 'linkedin', title: 'LinkedIn Profile', icon: ICONS.linkedin, isFolder: false, tooltip: 'Connect with me' }
];
"""

    return js_content

if __name__ == "__main__":
    # Sample Portfolio Data based on Refined Profile
    sample_portfolio = {
        "candidate": {
            "name": "Jane Doe",
            "summary": "Full-Stack Engineer specialized in React and Python. Refined through the campus2corporate (c2c) process.",
            "roles": ["Full-Stack Engineer", "Python Developer", "React Specialist"],
            "linkedin": "https://linkedin.com/in/janedoe",
            "github": "https://github.com/janedoe"
        },
        "projects": [
            {
                "id": "web-dashboard",
                "title": "Web Dashboard",
                "icon": "chart",
                "tooltip": "High-performance React Dashboard",
                "stack": "React, Vite, TypeScript",
                "impact": "Optimized UI performance by 40% using advanced memoization patterns.",
                "folder": "featured-projects"
            },
            {
                "id": "ai-orchestrator",
                "title": "AI Orchestrator",
                "icon": "robot",
                "tooltip": "Multi-agent coordinator",
                "stack": "Python, FastAPI",
                "impact": "Automated complex multi-step tasks using LangGraph and custom agents.",
                "folder": "ai-labs"
            }
        ],
        "folders": [
            { "id": "featured-projects", "title": "Featured Work", "icon": "folder", "tooltip": "Top technical achievements" },
            { "id": "ai-labs", "title": "AI Labs", "icon": "brain", "tooltip": "Experimental AI projects" }
        ]
    }

    print("--- GENERATING PROJECTS.JS ---")
    new_js = generate_projects_js(sample_portfolio)
    
    # Save to a temporary location for review
    with open("GENERATED_PROJECTS.js", "w", encoding="utf-8") as f:
        f.write(new_js)
    
    print("\n✅ New portfolio configuration saved to GENERATED_PROJECTS.js")
    print("🚀 This file can now be moved to services/brand-optimizer/homepage/projects.js to update the live site.")
