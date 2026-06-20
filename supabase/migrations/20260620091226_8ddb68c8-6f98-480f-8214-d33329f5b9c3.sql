DROP POLICY IF EXISTS "Anyone can read paid gifts" ON public.gifts;
REVOKE ALL ON public.gifts FROM anon;
REVOKE ALL ON public.gifts FROM authenticated;
GRANT ALL ON public.gifts TO service_role;