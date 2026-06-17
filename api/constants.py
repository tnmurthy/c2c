"""
Shared constants for the C2C API.
Extracted from api/index.py to eliminate duplication.
"""

# Icon mapping for portfolio generation
ICONS: dict[str, str] = {
    'computer': 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png',
    'folder': 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png',
    'text': 'https://win98icons.alexmeub.com/icons/png/notepad-5.png',
    'video': 'https://win98icons.alexmeub.com/icons/png/media_player-0.png',
    'gear': 'https://win98icons.alexmeub.com/icons/png/settings_gear-3.png',
    'msn': 'https://win98icons.alexmeub.com/icons/png/msn.png',
    'chart': 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
    'html': 'https://win98icons.alexmeub.com/icons/png/html-1.png',
    'world': 'https://win98icons.alexmeub.com/icons/png/world-0.png',
    'network': 'https://win98icons.alexmeub.com/icons/png/world_network_directories-3.png',
    'camera': 'https://win98icons.alexmeub.com/icons/png/camera-0.png',
    'certificate': 'https://win98icons.alexmeub.com/icons/png/certificate-0.png',
    'brain': 'https://win98icons.alexmeub.com/icons/png/entire_network_globe-3.png',
    'robot': 'https://win98icons.alexmeub.com/icons/png/computer_gear.png',
    'product': 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png',
    'strategy': 'https://win98icons.alexmeub.com/icons/png/check-0.png',
    'linkedin': 'https://win98icons.alexmeub.com/icons/png/msie1-2.png',
    'resume': 'https://win98icons.alexmeub.com/icons/png/notepad-4.png',
    'briefcase': 'https://win98icons.alexmeub.com/icons/png/briefcase-0.png',
    'book': 'https://win98icons.alexmeub.com/icons/png/help_book_big-0.png',
    'database': 'https://win98icons.alexmeub.com/icons/png/cylinder_database-1.png',
    'shield': 'https://win98icons.alexmeub.com/icons/png/key_padlock-0.png',
    'search': 'https://win98icons.alexmeub.com/icons/png/search_file-0.png',
    'finance': 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
    'terminal': 'https://win98icons.alexmeub.com/icons/png/ms_dos-0.png',
    'pipe': 'https://win98icons.alexmeub.com/icons/png/recycle_bin_full-4.png'
}

# Recommendation mapping for market leads scoring
RECOMMENDATION_MAPPING: dict[str, list[str]] = {
    "Builder": ["Engineer", "Developer", "Researcher", "Architect"],
    "Leader": ["Manager", "Lead", "Culture", "Director"],
    "Rainmaker": ["Sales", "Partnership", "Advocate", "Growth"],
    "Anchor": ["Operations", "QA", "SRE", "DevOps", "Analyst", "Data"]
}
