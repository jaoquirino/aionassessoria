
-- Financial categories table
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'both')),
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view financial_categories" ON public.financial_categories
  FOR SELECT TO authenticated USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can manage financial_categories" ON public.financial_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_financial_categories_updated_at
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Financial transactions table
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  is_auto_generated boolean NOT NULL DEFAULT false,
  reference_month date,
  created_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage financial_transactions" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can view financial_transactions" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_category ON public.financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_client ON public.financial_transactions(client_id);
CREATE INDEX idx_financial_transactions_ref_month ON public.financial_transactions(reference_month);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;

-- Default categories
INSERT INTO public.financial_categories (name, type, color) VALUES
  ('Contratos', 'income', '#22C55E'),
  ('Projetos Avulsos', 'income', '#3B82F6'),
  ('Marketing', 'expense', '#EF4444'),
  ('Ferramentas', 'expense', '#F59E0B'),
  ('Folha de Pagamento', 'expense', '#8B5CF6'),
  ('Infraestrutura', 'expense', '#EC4899'),
  ('Impostos', 'expense', '#6366F1'),
  ('Outros', 'both', '#6B7280');
