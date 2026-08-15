-- Migration: Update Auth Trigger for Client-Side Onboarding Synchronization
-- Description: Update handle_user_signup_role trigger to execute on INSERT or UPDATE, copying both role and profile_id from raw_user_meta_data to raw_app_meta_data.

CREATE OR REPLACE FUNCTION public.handle_user_signup_role()
RETURNS TRIGGER AS $$
DECLARE
  declared_role text;
  declared_profile_id text;
BEGIN
  -- Extract declared role
  declared_role := NEW.raw_user_meta_data->>'role';
  -- Extract profile_id
  declared_profile_id := NEW.raw_user_meta_data->>'profile_id';

  -- Block unauthorized admin role declaration
  IF declared_role = 'admin' THEN
    -- If it's an update, preserve existing admin role
    IF TG_OP = 'UPDATE' AND OLD.raw_app_meta_data->>'role' = 'admin' THEN
      declared_role := 'admin';
    ELSE
      declared_role := 'student';
    END IF;
  END IF;

  -- Default fallback
  IF declared_role IS NULL THEN
    declared_role := 'student';
  END IF;

  -- Store role inside raw_app_meta_data
  NEW.raw_app_meta_data := jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(declared_role)
  );

  -- Store profile_id inside raw_app_meta_data if present
  IF declared_profile_id IS NOT NULL THEN
    NEW.raw_app_meta_data := jsonb_set(
      NEW.raw_app_meta_data,
      '{profile_id}',
      to_jsonb(declared_profile_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users to run on INSERT or UPDATE of raw_user_meta_data
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
CREATE TRIGGER on_auth_user_signup
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_signup_role();
