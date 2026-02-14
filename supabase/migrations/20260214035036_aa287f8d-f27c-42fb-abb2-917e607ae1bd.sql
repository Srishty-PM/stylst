-- Add missing_items column to matched_looks to persist AI-detected missing items
ALTER TABLE public.matched_looks
ADD COLUMN missing_items jsonb DEFAULT '[]'::jsonb;