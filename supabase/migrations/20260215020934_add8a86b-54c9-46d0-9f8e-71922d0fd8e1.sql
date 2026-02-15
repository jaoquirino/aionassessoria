
-- Update the trigger function to derive weight from the linked module
CREATE OR REPLACE FUNCTION public.set_task_weight()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_weight integer;
BEGIN
  -- Try to get weight from the linked contract module
  IF NEW.contract_module_id IS NOT NULL THEN
    SELECT COALESCE(cm.custom_weight, sm.default_weight)
    INTO v_weight
    FROM public.contract_modules cm
    JOIN public.service_modules sm ON sm.id = cm.module_id
    WHERE cm.id = NEW.contract_module_id;
  END IF;

  -- Fallback to type-based weight if no module found
  IF v_weight IS NULL THEN
    v_weight := public.calculate_task_weight(NEW.type);
  END IF;

  NEW.weight := v_weight;
  RETURN NEW;
END;
$function$;

-- Update all existing tasks to use module-based weight
UPDATE public.tasks t
SET weight = COALESCE(cm.custom_weight, sm.default_weight)
FROM public.contract_modules cm
JOIN public.service_modules sm ON sm.id = cm.module_id
WHERE t.contract_module_id = cm.id;
