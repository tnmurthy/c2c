import subprocess
import sys
import os
import time
import threading

# Reconfigure stdout/stderr to support Unicode (emojis) in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Get script directory and project root directory dynamically
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

def run_backend():
    print("🚀 Starting FastAPI Backend (Port 8000)...")
    # Using uvicorn to run the api/main.py app with the same Python interpreter
    # Force working directory to project root so module resolution works
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=PROJECT_ROOT
    )

def run_frontend():
    print("⚛️ Starting Next.js Frontend (Port 3000)...")
    # Run next dev directly inside the project root directory
    subprocess.run(["npx", "next", "dev"], shell=True, cwd=PROJECT_ROOT)

if __name__ == "__main__":
    print("👔 CAMPUS2CORPORATE (C2C) LOCAL DEPLOYMENT")
    print("-" * 40)
    
    # Check for .env.local in project root
    env_local_path = os.path.join(PROJECT_ROOT, ".env.local")
    if not os.path.exists(env_local_path):
        print("⚠️ Warning: .env.local not found. Supabase Auth/DB may not work.")
        print("Run the setup or create .env.local with your Supabase keys.")
    
    # Run backend in a thread
    backend_thread = threading.Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Wait a bit for backend to initialize
    time.sleep(2)
    
    # Run frontend (main process)
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n👋 Shutting down local deployment...")
        sys.exit(0)
