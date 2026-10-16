-- Migration: Add comprehensive social media handles to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS x_url TEXT,
ADD COLUMN IF NOT EXISTS meta_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN students.github_url IS 'GitHub profile URL or handle';
COMMENT ON COLUMN students.x_url IS 'X / Twitter profile URL or handle';
COMMENT ON COLUMN students.meta_url IS 'Meta / Instagram / Threads profile URL or handle';
COMMENT ON COLUMN students.portfolio_url IS 'Personal portfolio or website URL';
COMMENT ON COLUMN students.social_links IS 'JSON dictionary of additional social networks';
