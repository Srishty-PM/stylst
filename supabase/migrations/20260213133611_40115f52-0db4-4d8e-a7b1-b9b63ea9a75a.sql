
-- Create a secure table for OAuth credentials (no SELECT policy = server-side only access)
CREATE TABLE public.oauth_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pinterest_access_token TEXT,
  pinterest_refresh_token TEXT,
  pinterest_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with NO select policy (tokens only accessible via service role)
ALTER TABLE public.oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Only allow server-side (service role) access - no user-facing policies for SELECT
-- Users can only insert/update their own credentials (needed for OAuth callback edge function)
CREATE POLICY "Service role only - no direct user access"
  ON public.oauth_credentials
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Migrate existing data
INSERT INTO public.oauth_credentials (user_id, pinterest_access_token, pinterest_refresh_token, pinterest_token_expires_at)
SELECT id, pinterest_access_token, pinterest_refresh_token, pinterest_token_expires_at
FROM public.profiles
WHERE pinterest_access_token IS NOT NULL;

-- Remove token columns from profiles table
ALTER TABLE public.profiles DROP COLUMN pinterest_access_token;
ALTER TABLE public.profiles DROP COLUMN pinterest_refresh_token;
ALTER TABLE public.profiles DROP COLUMN pinterest_token_expires_at;

-- Add updated_at trigger
CREATE TRIGGER update_oauth_credentials_updated_at
  BEFORE UPDATE ON public.oauth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
