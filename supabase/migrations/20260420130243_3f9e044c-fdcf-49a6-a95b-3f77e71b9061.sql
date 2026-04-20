
-- Trigger: definir automaticamente renewal_date para contratos não recorrentes (último dia do mês de start_date)
CREATE OR REPLACE FUNCTION public.set_non_recurring_contract_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Para contratos não recorrentes: renewal_date = último dia do mês de start_date
  IF NEW.is_recurring = false THEN
    NEW.renewal_date := (date_trunc('month', NEW.start_date) + interval '1 month - 1 day')::date;
    -- Se a data de fim já passou, marcar como encerrado
    IF NEW.renewal_date < CURRENT_DATE AND NEW.status = 'active' THEN
      NEW.status := 'ended';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_non_recurring_contract_end ON public.contracts;
CREATE TRIGGER trg_set_non_recurring_contract_end
  BEFORE INSERT OR UPDATE OF is_recurring, start_date ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_non_recurring_contract_end();

-- Atualizar contratos não recorrentes existentes que já passaram do fim do mês
UPDATE public.contracts
SET 
  renewal_date = (date_trunc('month', start_date) + interval '1 month - 1 day')::date,
  status = CASE 
    WHEN (date_trunc('month', start_date) + interval '1 month - 1 day')::date < CURRENT_DATE 
    THEN 'ended' 
    ELSE status 
  END
WHERE is_recurring = false;
