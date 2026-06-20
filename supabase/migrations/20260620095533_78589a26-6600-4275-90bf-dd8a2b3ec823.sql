-- Gifts are written and read exclusively by server functions using the service role
-- (which bypasses RLS). No client role should ever access this table directly.
-- Add an explicit deny-all policy so the table has a policy on record while
-- continuing to block anon/authenticated access to sensitive fields
-- (stripe_session_id, sender, recipient, paid).

REVOKE ALL ON public.gifts FROM anon, authenticated;

CREATE POLICY "Deny all client access to gifts"
ON public.gifts
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);