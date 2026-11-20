CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  p_key_hash text,
  p_limit integer DEFAULT 10,
  p_window_seconds integer DEFAULT 600
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_start timestamptz;
  v_count integer;
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[a-f0-9]{64}$'
     OR p_limit < 1 OR p_limit > 100
     OR p_window_seconds < 60 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO public.ai_rate_limits AS current_limit
    (key_hash, window_started_at, request_count, updated_at)
  VALUES
    (p_key_hash, v_now, 1, v_now)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN current_limit.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE current_limit.window_started_at
    END,
    request_count = CASE
      WHEN current_limit.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE current_limit.request_count + 1
    END,
    updated_at = v_now
  RETURNING window_started_at, request_count
  INTO v_start, v_count;

  RETURN QUERY
  SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    v_start + make_interval(secs => p_window_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(text, integer, integer) TO service_role;
