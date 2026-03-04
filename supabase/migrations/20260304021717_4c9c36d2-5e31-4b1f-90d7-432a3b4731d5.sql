
-- Create editorial_posts table
CREATE TABLE public.editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  social_network text NOT NULL,
  content_type text NOT NULL,
  title text NOT NULL,
  caption text,
  notes text,
  created_by uuid REFERENCES public.team_members(id),
  assigned_to uuid REFERENCES public.team_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for editorial_posts
CREATE POLICY "Team members can view editorial_posts" ON public.editorial_posts
  FOR SELECT USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert editorial_posts" ON public.editorial_posts
  FOR INSERT WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update editorial_posts" ON public.editorial_posts
  FOR UPDATE USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can delete editorial_posts" ON public.editorial_posts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_editorial_posts_updated_at
  BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create editorial_post_attachments table
CREATE TABLE public.editorial_post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_post_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view editorial_post_attachments" ON public.editorial_post_attachments
  FOR SELECT USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert editorial_post_attachments" ON public.editorial_post_attachments
  FOR INSERT WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can delete editorial_post_attachments" ON public.editorial_post_attachments
  FOR DELETE USING (is_team_member(auth.uid()));

-- Storage bucket for editorial media
INSERT INTO storage.buckets (id, name, public) VALUES ('editorial', 'editorial', true);

-- Storage RLS policies
CREATE POLICY "Team members can upload editorial files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'editorial' AND is_team_member(auth.uid()));

CREATE POLICY "Anyone can view editorial files" ON storage.objects
  FOR SELECT USING (bucket_id = 'editorial');

CREATE POLICY "Team members can delete editorial files" ON storage.objects
  FOR DELETE USING (bucket_id = 'editorial' AND is_team_member(auth.uid()));
