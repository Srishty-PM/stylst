
-- Analytics events table
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  device_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (including anonymous visitors)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only service role can read (no client-side reads)
CREATE POLICY "No client reads on analytics"
ON public.analytics_events
FOR SELECT
USING (false);

-- Indexes for efficient querying
CREATE INDEX idx_analytics_event_type ON public.analytics_events (event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_device_id ON public.analytics_events (device_id);
CREATE INDEX idx_analytics_user_id ON public.analytics_events (user_id);
CREATE INDEX idx_analytics_session_id ON public.analytics_events (session_id);
