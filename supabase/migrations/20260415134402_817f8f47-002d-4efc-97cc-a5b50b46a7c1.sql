
-- 1. Add employment_type to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'employee';

-- 2. Freelancer rates table
CREATE TABLE public.freelancer_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.service_modules(id) ON DELETE CASCADE,
  deliverable_type text, -- arte, vídeo, carrossel, fotografia, etc. NULL = rate for entire module
  rate_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, module_id, deliverable_type)
);

ALTER TABLE public.freelancer_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage freelancer_rates" ON public.freelancer_rates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view freelancer_rates" ON public.freelancer_rates
  FOR SELECT TO authenticated USING (is_team_member(auth.uid()));

CREATE TRIGGER update_freelancer_rates_updated_at
  BEFORE UPDATE ON public.freelancer_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Payment periods table
CREATE TABLE public.payment_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, paid
  total_amount numeric NOT NULL DEFAULT 0,
  approved_at timestamptz,
  paid_at timestamptz,
  financial_transaction_id uuid REFERENCES public.financial_transactions(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment_periods" ON public.payment_periods
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own payment_periods" ON public.payment_periods
  FOR SELECT TO authenticated USING (
    team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update own payment_periods for approval" ON public.payment_periods
  FOR UPDATE TO authenticated USING (
    team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid())
    AND status = 'pending_approval'
  );

CREATE TRIGGER update_payment_periods_updated_at
  BEFORE UPDATE ON public.payment_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Payment period tasks table
CREATE TABLE public.payment_period_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_period_id uuid NOT NULL REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  is_included boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_period_id, task_id)
);

ALTER TABLE public.payment_period_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment_period_tasks" ON public.payment_period_tasks
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own payment_period_tasks" ON public.payment_period_tasks
  FOR SELECT TO authenticated USING (
    payment_period_id IN (
      SELECT id FROM public.payment_periods
      WHERE team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

-- 5. Contract payments table (monthly payment tracking)
CREATE TABLE public.contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reference_month date NOT NULL, -- first day of month
  status text NOT NULL DEFAULT 'pending', -- pending, paid
  paid_at timestamptz,
  financial_transaction_id uuid REFERENCES public.financial_transactions(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, reference_month)
);

ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract_payments" ON public.contract_payments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can view contract_payments" ON public.contract_payments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_contract_payments_updated_at
  BEFORE UPDATE ON public.contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_payment_periods_team_member ON public.payment_periods(team_member_id);
CREATE INDEX idx_payment_periods_status ON public.payment_periods(status);
CREATE INDEX idx_contract_payments_contract ON public.contract_payments(contract_id);
CREATE INDEX idx_contract_payments_month ON public.contract_payments(reference_month);
CREATE INDEX idx_freelancer_rates_member ON public.freelancer_rates(team_member_id);
