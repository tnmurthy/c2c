import os
import time
import sys
from dotenv import load_dotenv
from supabase import create_client

# Reconfigure stdout/stderr to support UTF-8 formatting in Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Get script directory and project root directory dynamically
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))

# Load .env.local
env_path = os.path.join(PROJECT_ROOT, ".env.local")
load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
    sys.exit(1)

supabase = create_client(url, key)

print("⚡ CAMPUS2CORPORATE (C2C) EMAIL CONFIRMATION WATCHDOG")
print("-" * 55)
print("Watching for new user signups to automatically confirm emails...")

try:
    while True:
        try:
            # List users via auth admin API
            users = supabase.auth.admin.list_users()
            for user in users:
                if not user.email_confirmed_at:
                    print(f"👥 Found unconfirmed user: {user.email} (Role: {user.user_metadata.get('role', 'student')})")
                    # Update user to confirm email address
                    supabase.auth.admin.update_user_by_id(
                        user.id,
                        attributes={"email_confirm": True}
                    )
                    print(f"✅ Successfully confirmed email for: {user.email}")
        except Exception as e:
            print(f"⚠️ Error checking users: {e}")
        
        time.sleep(2)
except KeyboardInterrupt:
    print("\nStopping email confirmation watchdog...")
    sys.exit(0)
