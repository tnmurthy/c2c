import os
import sys
import json
import random
from typing import Dict, Any, Optional

# Add project root and market-scout directory to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Try to import generative model client
try:
    from services.market_scout.ai.client import generate as gemini_generate
except ImportError:
    gemini_generate = None

def generate_llm_item(dimension: str, item_type: str, context: str) -> Dict[str, Any]:
    """
    Generates a psychometric item using Gemini API and validates it against the schema.
    If Gemini API key is missing or call fails/is invalid, falls back to deterministic mock generator.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if api_key and gemini_generate:
        prompt = f"""
        Generate a single psychometric assessment question matching this strict JSON schema.
        
        CRITICAL PARAMETERS:
        - Primary Dimension: "{dimension}"
        - Item Type: "{item_type}"
        - Context Tag: "{context}"

        OUTPUT JSON STRUCTURE:
        {{
            "stem": "The question or scenario text. Make it highly engaging, modern, and realistic for a fresh graduate entering startup or corporate work.",
            "item_type": "{item_type}",
            "primary_dimension": "{dimension}",
            "secondary_dimensions": ["Sub-dimension 1", "Sub-dimension 2"],
            "tags": ["{context}", "custom-tag"],
            "options": {{"A": "Choice A", "B": "Choice B", "C": "Choice C", "D": "Choice D"}} or null (Only null if type is Likert),
            "scoring_logic": "For SJT: 'B: 4, A: 2, C: 0, D: 1.' For Likert: '1-5 scale. High score = high resilience.' For Cognitive: 'Correct: B. (brief explanation)'"
        }}

        Do not return any markdown code block formatting or any extra text. Return only the raw JSON object.
        """
        try:
            res = gemini_generate(prompt, model="gemini-2.0-flash-lite")
            if res and isinstance(res, dict):
                if "id" not in res:
                    import uuid
                    res["id"] = f"GEN-{dimension}-{uuid.uuid4().hex[:6].upper()}"
                # Run quality control validation
                if validate_item_schema(res, dimension, item_type):
                    return res
                else:
                    print("[Generator] Generated item failed quality validation schema. Using fallback.")
        except Exception as e:
            print(f"[Generator] LLM Generation failed: {e}. Using fallback.")
            
    # Fallback deterministic generator
    return generate_fallback_item(dimension, item_type, context)

def validate_item_schema(item: Dict[str, Any], expected_dim: str, expected_type: str) -> bool:
    """Validates that the generated item meets all required database and schema structures."""
    try:
        # Check required fields
        required_keys = ["id", "stem", "item_type", "primary_dimension", "scoring_logic"]
        if not all(k in item for k in required_keys):
            return False
            
        # Validate values and types
        if not isinstance(item["stem"], str) or len(item["stem"].strip()) < 10:
            return False
            
        if item["primary_dimension"] != expected_dim:
            return False
            
        if item["item_type"] != expected_type:
            return False
            
        # Validate options based on type
        if expected_type in ("SJT", "Cognitive"):
            if not isinstance(item.get("options"), dict) or len(item["options"]) != 4:
                return False
            if not all(k in item["options"] for k in ("A", "B", "C", "D")):
                return False
        else:
            # Likert
            if item.get("options") is not None:
                return False
                
        return True
    except Exception:
        return False

def generate_fallback_item(dimension: str, item_type: str, context: str) -> Dict[str, Any]:
    """Generates a deterministic validated mock item if LLM fails or is unconfigured."""
    q_id = f"MOCK-{dimension}-{random.randint(100, 999)}"
    
    if item_type == "Likert":
        return {
            "id": q_id,
            "stem": f"When executing tasks in a high-pressure {context} setting, I easily adapt to changing constraints without losing motivation.",
            "item_type": "Likert",
            "primary_dimension": dimension,
            "secondary_dimensions": ["Adaptability", "Motivation"],
            "tags": [context, "mock-fallback"],
            "options": None,
            "scoring_logic": "1-5 scale. High score = high performance under pressure."
        }
    elif item_type == "SJT":
        return {
            "id": q_id,
            "stem": f"During a critical phase in a {context} project, your main server crashes 2 hours before the deadline. What is your immediate reaction?",
            "item_type": "SJT",
            "primary_dimension": dimension,
            "secondary_dimensions": ["Crisis Management", "Communication"],
            "tags": [context, "mock-fallback"],
            "options": {
                "A": "Notify the stakeholders immediately and propose an extension plan.",
                "B": "Panick and blame the devops team.",
                "C": "Try to fix it alone silently hoping no one notices the delay.",
                "D": "Work with the team to set up a static backup server to maintain uptime."
            },
            "scoring_logic": "D: 4, A: 3, C: 1, B: 0."
        }
    else: # Cognitive (IQ)
        return {
            "id": q_id,
            "stem": f"If a {context} team has a sprint velocity of 40 points, and a scope change adds 20% more points, what is the new total workload?",
            "item_type": "Cognitive",
            "primary_dimension": "IQ",
            "secondary_dimensions": ["Numerical Reasoning"],
            "tags": [context, "mock-fallback"],
            "options": {
                "A": "44 points",
                "B": "48 points",
                "C": "50 points",
                "D": "40 points"
            },
            "scoring_logic": "Correct: B (40 * 1.2 = 48)."
        }
