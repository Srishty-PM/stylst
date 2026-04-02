-- Fix 1: Lock down influencer_styles to service-role-only writes
DROP POLICY IF EXISTS "Authenticated users can insert influencer styles" ON public.influencer_styles;
DROP POLICY IF EXISTS "Authenticated users can update influencer styles" ON public.influencer_styles;

-- Block all direct client writes (service role bypasses RLS)
CREATE POLICY "No direct client inserts on influencer styles"
  ON public.influencer_styles FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct client updates on influencer styles"
  ON public.influencer_styles FOR UPDATE
  USING (false);

-- Fix 2: Add missing UPDATE policy on inspiration table
CREATE POLICY "Users can update own inspiration"
  ON public.inspiration FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);