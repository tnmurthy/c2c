import unittest
from api.item_generator import generate_llm_item, validate_item_schema, generate_fallback_item

class TestItemGenerator(unittest.TestCase):
    def test_schema_validator_valid_likert(self):
        item = {
            "id": "AQ-TEST",
            "stem": "I adapt easily to new environments and challenges.",
            "item_type": "Likert",
            "primary_dimension": "AQ",
            "secondary_dimensions": ["Adaptability"],
            "tags": ["remote"],
            "options": None,
            "scoring_logic": "1-5 scale"
        }
        self.assertTrue(validate_item_schema(item, "AQ", "Likert"))

    def test_schema_validator_invalid_type(self):
        item = {
            "stem": "I adapt easily to new environments.",
            "item_type": "SJT",  # Mismatch
            "primary_dimension": "AQ",
            "options": None,
            "scoring_logic": "1-5"
        }
        self.assertFalse(validate_item_schema(item, "AQ", "Likert"))

    def test_schema_validator_valid_sjt(self):
        item = {
            "id": "EQ-TEST",
            "stem": "A colleague is struggling with a high workload. What do you do?",
            "item_type": "SJT",
            "primary_dimension": "EQ",
            "secondary_dimensions": ["Empathy"],
            "tags": ["collaboration"],
            "options": {
                "A": "Help them",
                "B": "Ignore them",
                "C": "Report them",
                "D": "Do everything"
            },
            "scoring_logic": "A: 4, B: 1"
        }
        self.assertTrue(validate_item_schema(item, "EQ", "SJT"))

    def test_schema_validator_invalid_sjt_options(self):
        item = {
            "stem": "A colleague is struggling with a workload.",
            "item_type": "SJT",
            "primary_dimension": "EQ",
            "options": {"A": "Help them", "B": "Ignore them"},  # Missing C, D
            "scoring_logic": "A: 4, B: 1"
        }
        self.assertFalse(validate_item_schema(item, "EQ", "SJT"))

    def test_fallback_generator(self):
        item = generate_fallback_item("SQ", "Likert", "networking")
        self.assertEqual(item["primary_dimension"], "SQ")
        self.assertEqual(item["item_type"], "Likert")
        self.assertTrue(validate_item_schema(item, "SQ", "Likert"))

        sjt_item = generate_fallback_item("EQ", "SJT", "conflict")
        self.assertEqual(sjt_item["primary_dimension"], "EQ")
        self.assertEqual(sjt_item["item_type"], "SJT")
        self.assertTrue(validate_item_schema(sjt_item, "EQ", "SJT"))

    def test_generator_fallback_lifecycle(self):
        # Even without GEMINI_API_KEY, generate_llm_item should fall back and return a valid mock item
        item = generate_llm_item("AQ", "Likert", "startup")
        self.assertEqual(item["primary_dimension"], "AQ")
        self.assertEqual(item["item_type"], "Likert")
        self.assertTrue(validate_item_schema(item, "AQ", "Likert"))

if __name__ == "__main__":
    unittest.main()
