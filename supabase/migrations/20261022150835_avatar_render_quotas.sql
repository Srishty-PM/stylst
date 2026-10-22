-- Avatar-only controls. No photos, prompts, measurements or generated images are stored here.
CREATE TABLE public.avatar_service_config (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  paid_services_verified boolean NOT NULL DEFAULT false,
  verification_note text,
  model text NOT NULL DEFAULT 'gemini-3.1-flash-image',
  per_user_daily_limit integer NOT NULL DEFAULT 3 CHECK (per_user_daily_limit BETWEEN 1 AND 10),
  per_user_attempt_limit integer NOT NULL DEFAULT 6 CHECK (per_user_attempt_limit BETWEEN 1 AND 20),
  global_daily_limit integer NOT NULL DEFAULT 50 CHECK (global_daily_limit BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.avatar_service_config(id) VALUES (1);
ALTER TABLE public.avatar_service_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.avatar_service_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.avatar_service_config TO service_role;

-- Anonymous global attempt totals survive account deletion so the cost ceiling cannot be reset.
CREATE TABLE public.avatar_global_daily_usage (
  day date PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);
ALTER TABLE public.avatar_global_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.avatar_global_daily_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.avatar_global_daily_usage TO service_role;

CREATE TABLE public.avatar_render_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX avatar_render_requests_user_date_idx ON public.avatar_render_requests(user_id, created_at DESC);
CREATE INDEX avatar_render_requests_date_idx ON public.avatar_render_requests(created_at DESC);
ALTER TABLE public.avatar_render_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.avatar_render_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.avatar_render_requests TO service_role;

-- Only the authenticated Edge Function's server-side service client may call these functions.
-- SECURITY INVOKER: no privilege escalation and no client-supplied limit or owner override.
CREATE OR REPLACE FUNCTION public.avatar_render_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE cfg public.avatar_service_config%ROWTYPE; utc_day timestamptz;
  used integer; attempted integer; global_attempts integer;
BEGIN
  SELECT * INTO STRICT cfg FROM public.avatar_service_config WHERE id=1;
  utc_day := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT count(*) FILTER (WHERE status <> 'failed'), count(*) INTO used, attempted
    FROM public.avatar_render_requests WHERE user_id=p_user_id AND created_at >= utc_day;
  SELECT coalesce((SELECT attempts FROM public.avatar_global_daily_usage WHERE day=(now() AT TIME ZONE 'UTC')::date),0) INTO global_attempts;
  RETURN jsonb_build_object('enabled',cfg.enabled AND cfg.paid_services_verified,
    'remaining',greatest(0,least(cfg.per_user_daily_limit-used,cfg.per_user_attempt_limit-attempted)),
    'dailyLimit',cfg.per_user_daily_limit,'globalAvailable',global_attempts < cfg.global_daily_limit,
    'resetsAt',utc_day + interval '1 day');
END $$;

CREATE OR REPLACE FUNCTION public.reserve_avatar_render(p_user_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE state jsonb; pending_count integer;
BEGIN
  -- One short database transaction serializes check-and-reserve across all function instances.
  PERFORM pg_catalog.pg_advisory_xact_lock(74688120261022::bigint);
  IF p_user_id IS NULL OR p_request_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'reason','invalid');
  END IF;
  IF EXISTS(SELECT 1 FROM public.avatar_render_requests WHERE id=p_request_id) THEN
    RETURN jsonb_build_object('allowed',false,'reason','duplicate');
  END IF;
  state := public.avatar_render_status(p_user_id);
  IF NOT (state->>'enabled')::boolean THEN RETURN jsonb_build_object('allowed',false,'reason','disabled'); END IF;
  IF (state->>'remaining')::integer <= 0 THEN RETURN jsonb_build_object('allowed',false,'reason','user_limit'); END IF;
  IF NOT (state->>'globalAvailable')::boolean THEN RETURN jsonb_build_object('allowed',false,'reason','global_limit'); END IF;
  IF EXISTS(SELECT 1 FROM public.avatar_render_requests WHERE user_id=p_user_id AND status='pending' AND created_at > now()-interval '2 minutes') THEN
    RETURN jsonb_build_object('allowed',false,'reason','already_running');
  END IF;
  SELECT count(*) INTO pending_count FROM public.avatar_render_requests WHERE status='pending' AND created_at > now()-interval '2 minutes';
  IF pending_count >= 5 THEN RETURN jsonb_build_object('allowed',false,'reason','busy'); END IF;
  INSERT INTO public.avatar_render_requests(id,user_id) VALUES(p_request_id,p_user_id);
  INSERT INTO public.avatar_global_daily_usage(day,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT(day) DO UPDATE SET attempts=public.avatar_global_daily_usage.attempts+1;
  RETURN jsonb_build_object('allowed',true,'remaining',(state->>'remaining')::integer-1);
END $$;

CREATE OR REPLACE FUNCTION public.finish_avatar_render(p_request_id uuid, p_success boolean)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  UPDATE public.avatar_render_requests SET status=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,completed_at=now()
  WHERE id=p_request_id AND status='pending';
$$;
REVOKE ALL ON FUNCTION public.avatar_render_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_avatar_render(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_avatar_render(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.avatar_render_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_avatar_render(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_avatar_render(uuid,boolean) TO service_role;
COMMENT ON TABLE public.avatar_render_requests IS 'Avatar quota attempt metadata only. No photos, image data, prompts or body settings. Account deletion cascades.';
