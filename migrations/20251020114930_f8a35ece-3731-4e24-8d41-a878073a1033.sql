-- Change invitation expiration time from 7 days to 1 hour
ALTER TABLE public.invitations
ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 hour');