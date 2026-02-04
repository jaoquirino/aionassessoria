-- Add username column to profiles table for username-based auth
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.username IS 'Username for login (internal email is generated as username@internal.local)';