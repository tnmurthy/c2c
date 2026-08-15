import asyncio
import os
import sys
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "services", "job-intel-desk", "backend"))

async def test_live_fire(username):
    print(f"🚀 LOADING MANUAL PROFILE: {username}")
    
    profile_file = "KARPATHY_PROFILE.json"
    if not os.path.exists(profile_file):
        print(f"❌ Error: {profile_file} not found")
        return
    
    # Now run the C2C pipeline
    print(f"\n👔 RUNNING campus2corporate (c2c) PIPELINE FOR {username}...")
    from C2C_AGENCY import run_pipeline
    
    # Create a JD for an AI position
    jd_file = "TEST_AI_JD.txt"
    with open(jd_file, "w") as f:
        f.write("""
        Job Title: Senior AI Research Engineer
        Company: OpenAI
        Description: We are looking for engineers who can build LLMs from scratch. 
        Requirements: Expert knowledge of Transformers, CUDA kernels, and large-scale training.
        Required Stack: Python, PyTorch, C++, CUDA, Transformers.
        """)
    
    run_pipeline(profile_file, jd_file)
    print("\n💡 Pipeline run complete. View results in ORDEAL_PROMPT.md and then run:")
    print(f"python C2C_AGENCY.py serve")

if __name__ == "__main__":
    username = "karpathy"
    if len(sys.argv) > 1:
        username = sys.argv[1]
    asyncio.run(test_live_fire(username))
