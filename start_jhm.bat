@echo off
:: start_jhm.bat — Starts JustHireMe sidecar and captures PORT + TOKEN
:: Run this before starting the C2C API backend.
:: Usage: double-click or run from project root:  .\start_jhm.bat

echo Starting JustHireMe sidecar...
cd /d "%~dp0services\justhireme\backend"

:: Check if uv is available (preferred) or fall back to python
where uv >nul 2>&1
if %errorlevel% == 0 (
    echo Using uv...
    uv run python main.py
) else (
    echo Using python...
    python main.py
)
