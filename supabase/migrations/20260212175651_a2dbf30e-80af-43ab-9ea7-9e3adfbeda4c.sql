
-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  pinterest_connected BOOLEAN NOT NULL DEFAULT FALSE,
  pinterest_access_token TEXT,
  pinterest_refresh_token TEXT,
  pinterest_token_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  style_goals TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Closet items
CREATE TABLE public.closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  colors TEXT[],
  brand TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  tags TEXT[],
  purchase_price DECIMAL(10,2),
  times_worn INTEGER NOT NULL DEFAULT 0,
  last_worn_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own closet items" ON public.closet_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own closet items" ON public.closet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own closet items" ON public.closet_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own closet items" ON public.closet_items FOR DELETE USING (auth.uid() = user_id);

-- Inspiration sources (Pinterest boards, etc.)
CREATE TABLE public.inspiration_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT,
  external_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inspiration_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inspiration sources" ON public.inspiration_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inspiration sources" ON public.inspiration_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inspiration sources" ON public.inspiration_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inspiration sources" ON public.inspiration_sources FOR DELETE USING (auth.uid() = user_id);

-- Inspiration images
CREATE TABLE public.inspiration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.inspiration_sources(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_url TEXT,
  description TEXT,
  detected_items TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inspiration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inspiration" ON public.inspiration FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inspiration" ON public.inspiration FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own inspiration" ON public.inspiration FOR DELETE USING (auth.uid() = user_id);

-- Matched looks
CREATE TABLE public.matched_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inspiration_id UUID REFERENCES public.inspiration(id) ON DELETE SET NULL,
  closet_item_ids UUID[] NOT NULL,
  occasion TEXT,
  season TEXT,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matched_looks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own matched looks" ON public.matched_looks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matched looks" ON public.matched_looks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own matched looks" ON public.matched_looks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own matched looks" ON public.matched_looks FOR DELETE USING (auth.uid() = user_id);

-- Scheduled outfits
CREATE TABLE public.scheduled_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_look_id UUID NOT NULL REFERENCES public.matched_looks(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  event_name TEXT,
  was_worn BOOLEAN NOT NULL DEFAULT FALSE,
  worn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scheduled outfits" ON public.scheduled_outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scheduled outfits" ON public.scheduled_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scheduled outfits" ON public.scheduled_outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled outfits" ON public.scheduled_outfits FOR DELETE USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('closet-images', 'closet-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('inspiration-images', 'inspiration-images', true);

-- Storage policies
CREATE POLICY "Users can upload own closet images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view closet images" ON storage.objects FOR SELECT
  USING (bucket_id = 'closet-images');
CREATE POLICY "Users can delete own closet images" ON storage.objects FOR DELETE
  USING (bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own inspiration images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspiration-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view inspiration images" ON storage.objects FOR SELECT
  USING (bucket_id = 'inspiration-images');
CREATE POLICY "Users can delete own inspiration images" ON storage.objects FOR DELETE
  USING (bucket_id = 'inspiration-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_closet_items_updated_at BEFORE UPDATE ON public.closet_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matched_looks_updated_at BEFORE UPDATE ON public.matched_looks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
