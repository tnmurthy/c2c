"""Opt-in gate for tests that write to a real Supabase database.

These tests seed and delete rows, so they run only when asked to:
`C2C_DB_TESTS=1`, against a database you are willing to write to -- a local
`supabase start` stack, not production. Without the flag they are skipped,
which is what CI does: it has no database to reach.
"""

import os
import unittest

requires_db = unittest.skipUnless(
    os.getenv("C2C_DB_TESTS") == "1",
    "writes to Supabase; set C2C_DB_TESTS=1 against a non-production database",
)
