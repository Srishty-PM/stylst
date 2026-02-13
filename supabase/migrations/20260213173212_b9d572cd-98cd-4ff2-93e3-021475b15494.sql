
-- Influencer styles library (cached style profiles)
CREATE TABLE public.influencer_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_name TEXT NOT NULL,
  instagram_handle TEXT,
  style_profile JSONB NOT NULL,
  user_uploaded_photos TEXT[],
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's selected influencer preferences
CREATE TABLE public.user_influencer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  influencer_style_id UUID NOT NULL REFERENCES public.influencer_styles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, influencer_style_id)
);

-- Enable RLS
ALTER TABLE public.influencer_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_influencer_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for influencer_styles
CREATE POLICY "Anyone can view influencer styles"
  ON public.influencer_styles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert influencer styles"
  ON public.influencer_styles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update influencer styles"
  ON public.influencer_styles FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for user_influencer_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_influencer_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_influencer_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_influencer_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_influencer_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_influencer_name ON public.influencer_styles(influencer_name);
CREATE INDEX idx_user_preferences ON public.user_influencer_preferences(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_influencer_styles_updated_at
  BEFORE UPDATE ON public.influencer_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
