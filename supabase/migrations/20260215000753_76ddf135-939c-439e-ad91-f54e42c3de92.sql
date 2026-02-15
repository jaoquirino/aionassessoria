
-- Add 'onboarding' to the task_type enum
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'onboarding';

-- Update the weight calculation function to handle the new type
CREATE OR REPLACE FUNCTION public.calculate_task_weight(task_type task_type)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN CASE task_type
        WHEN 'recurring' THEN 2
        WHEN 'planning' THEN 1
        WHEN 'project' THEN 4
        WHEN 'extra' THEN 3
        WHEN 'onboarding' THEN 4
    END;
END;
$function$;
