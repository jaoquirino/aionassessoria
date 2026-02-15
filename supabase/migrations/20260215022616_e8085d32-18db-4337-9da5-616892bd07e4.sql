
CREATE TABLE public.saved_colors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hex text NOT NULL,
  label text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view saved_colors" ON public.saved_colors FOR SELECT USING (is_team_member(auth.uid()));
CREATE POLICY "Admins can insert saved_colors" ON public.saved_colors FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update saved_colors" ON public.saved_colors FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete saved_colors" ON public.saved_colors FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with default palette
INSERT INTO public.saved_colors (hex, label, order_index) VALUES
  ('#9CA3AF', 'Cinza', 1),
  ('#3B82F6', 'Azul', 2),
  ('#10B981', 'Verde', 3),
  ('#F59E0B', 'Amarelo', 4),
  ('#06B6D4', 'Ciano', 5),
  ('#EF4444', 'Vermelho', 6),
  ('#A855F7', 'Roxo', 7),
  ('#F97316', 'Laranja', 8),
  ('#EC4899', 'Rosa', 9),
  ('#84CC16', 'Lima', 10);
