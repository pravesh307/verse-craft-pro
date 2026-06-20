CREATE TABLE public.gifts (
  id text PRIMARY KEY,
  poem jsonb NOT NULL,
  photo text,
  occasion text,
  sender text,
  recipient text,
  paid boolean NOT NULL DEFAULT false,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gifts TO anon;
GRANT SELECT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read paid gifts"
  ON public.gifts FOR SELECT
  TO anon, authenticated
  USING (paid = true);