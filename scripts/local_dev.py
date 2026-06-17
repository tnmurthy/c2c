import subprocess
import sys
import os
import time
import threading

def run_backend():
    print("🚀 Starting FastAPI Backend (Port 8000)...")
    # Using uvicorn to run the api/index.py app
    # We need to make sure the working directory is root so sys.path logic works
    subprocess.run(["uvicorn", "api.index:app", "--host", "127.0.0.1", "--port", "8000", "--reload"])

def run_frontend():
    print("⚛️ Starting Next.js Frontend (Port 3000)...")
    subprocess.run(["npm", "run", "dev"], shell=True)

if __name__ == "__main__":
    print("👔 CAMPUS2CORPORATE (C2C) LOCAL DEPLOYMENT")
    print("-" * 40)
    
    # Check for .env.local
    if not os.path.exists(".env.local"):
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
