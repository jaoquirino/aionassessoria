-- Create improved trigger to log ALL task changes (including field edits, not just status/assignee)
CREATE OR REPLACE FUNCTION public.log_task_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
        VALUES (NEW.id, 'status_change', OLD.status::TEXT, NEW.status::TEXT, auth.uid()::TEXT);
    END IF;
    
    -- Assignee change
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
        VALUES (NEW.id, 'assignee_change', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, auth.uid()::TEXT);
    END IF;
    
    -- Title change
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.title, NEW.title, auth.uid()::TEXT, 'title');
    END IF;
    
    -- Priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.priority, NEW.priority, auth.uid()::TEXT, 'priority');
    END IF;
    
    -- Due date change
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.due_date::TEXT, NEW.due_date::TEXT, auth.uid()::TEXT, 'due_date');
    END IF;
    
    -- Client change
    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.client_id::TEXT, NEW.client_id::TEXT, auth.uid()::TEXT, 'client_id');
    END IF;
    
    -- Contract module change
    IF OLD.contract_module_id IS DISTINCT FROM NEW.contract_module_id THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.contract_module_id::TEXT, NEW.contract_module_id::TEXT, auth.uid()::TEXT, 'contract_module_id');
    END IF;
    
    -- Type change
    IF OLD.type IS DISTINCT FROM NEW.type THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.type::TEXT, NEW.type::TEXT, auth.uid()::TEXT, 'type');
    END IF;
    
    -- Required role change
    IF OLD.required_role IS DISTINCT FROM NEW.required_role THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', OLD.required_role, NEW.required_role, auth.uid()::TEXT, 'required_role');
    END IF;
    
    -- Description notes change
    IF OLD.description_notes IS DISTINCT FROM NEW.description_notes THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by, comment)
        VALUES (NEW.id, 'field_change', 'observações atualizadas', 'observações atualizadas', auth.uid()::TEXT, 'description_notes');
    END IF;
    
    -- Archive/unarchive
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
        VALUES (NEW.id, 'archived', NULL, NEW.archived_at::TEXT, auth.uid()::TEXT);
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
        VALUES (NEW.id, 'unarchived', OLD.archived_at::TEXT, NULL, auth.uid()::TEXT);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_task_update_history ON public.tasks;
CREATE TRIGGER on_task_update_history
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.log_task_history();