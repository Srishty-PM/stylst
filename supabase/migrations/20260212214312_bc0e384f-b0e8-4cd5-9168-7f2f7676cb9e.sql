
-- Add missing columns to closet_items
ALTER TABLE public.closet_items 
  ADD COLUMN IF NOT EXISTS image_url_cleaned text,
  ADD COLUMN IF NOT EXISTS ai_confidence decimal(3,2),
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- Add onboarding_step to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- Add times_worn to matched_looks
ALTER TABLE public.matched_looks 
  ADD COLUMN IF NOT EXISTS times_worn integer DEFAULT 0;
