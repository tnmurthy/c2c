-- Migration: TPO / Institution Pre-Verification Layer
-- Description: Adds tracking fields to students and creates a whitelist for institutions

-- 1. Add fields to students and institutions tables
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS institution_id BIGINT REFERENCES institutions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Create the institution_whitelist table
CREATE TABLE IF NOT EXISTS institution_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id, email)
);

-- 3. RLS for institution_whitelist
ALTER TABLE institution_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution can read own whitelist" 
ON institution_whitelist FOR SELECT 
USING (institution_id IN (
    SELECT id FROM institutions WHERE auth_id = auth.uid()
));

CREATE POLICY "Institution can insert to own whitelist" 
ON institution_whitelist FOR INSERT 
WITH CHECK (institution_id IN (
    SELECT id FROM institutions WHERE auth_id = auth.uid()
));

CREATE POLICY "Institution can delete from own whitelist" 
ON institution_whitelist FOR DELETE 
USING (institution_id IN (
    SELECT id FROM institutions WHERE auth_id = auth.uid()
));



-- 4. Secure function for student onboarding to check whitelist without reading whole table
CREATE OR REPLACE FUNCTION check_whitelist_email(inst_id BIGINT, check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_whitelisted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM institution_whitelist
        WHERE institution_id = inst_id AND email = check_email
    ) INTO is_whitelisted;
    
    RETURN is_whitelisted;
END;
$$;
