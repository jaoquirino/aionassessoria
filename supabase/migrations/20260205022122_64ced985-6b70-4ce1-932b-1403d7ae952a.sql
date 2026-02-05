-- Add is_internal column to clients to mark internal clients that don't count in revenue
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Create AION Assessoria as internal client
INSERT INTO public.clients (name, status, is_internal)
VALUES ('AION Assessoria', 'active', true)
ON CONFLICT DO NOTHING;