-- 1) Ensure onboarding steps are auto-created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_initialize_client_onboarding'
  ) THEN
    CREATE TRIGGER tr_initialize_client_onboarding
    AFTER INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_client_onboarding();
  END IF;
END $$;

-- Backfill onboarding steps for existing onboarding clients missing steps
WITH onboarding_clients AS (
  SELECT c.id
  FROM public.clients c
  WHERE c.status = 'onboarding'
), missing AS (
  SELECT oc.id AS client_id
  FROM onboarding_clients oc
  LEFT JOIN public.client_onboarding co ON co.client_id = oc.id
  GROUP BY oc.id
  HAVING COUNT(co.id) = 0
)
INSERT INTO public.client_onboarding (client_id, step_name, step_order)
SELECT m.client_id, s.step_name, s.step_order
FROM missing m
CROSS JOIN (VALUES
  ('Coleta de acessos', 1),
  ('Briefing inicial', 2),
  ('Definição de módulos', 3),
  ('Reunião de kickoff', 4)
) AS s(step_name, step_order);

-- 2) Link logged-in users to team_members (needed for per-user dashboards)
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_unique
ON public.team_members (user_id)
WHERE user_id IS NOT NULL;

-- 3) Persist per-user UI preferences (future-proof)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY,
  theme text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: users manage their own preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences"
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can upsert own preferences'
  ) THEN
    CREATE POLICY "Users can upsert own preferences"
    ON public.user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own preferences"
    ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger for user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER tr_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Avatar storage (public bucket) + policies
-- NOTE: this uses the platform's storage schema.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  -- Authenticated users can upload into their own folder: {user_id}/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;