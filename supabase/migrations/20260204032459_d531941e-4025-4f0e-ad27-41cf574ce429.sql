-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_log_task_history ON public.tasks;
DROP FUNCTION IF EXISTS public.log_task_history() CASCADE;

-- Recreate the function - using the team_member ID lookup instead of auth.uid()
-- The performed_by column references team_members, so we need to look up the team_member by user_id
CREATE OR REPLACE FUNCTION public.log_task_history()
RETURNS TRIGGER AS $$
DECLARE
  v_team_member_id uuid;
BEGIN
  -- Get the team_member id for the current auth user
  SELECT id INTO v_team_member_id 
  FROM public.team_members 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Log title change
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'title_changed', OLD.title, NEW.title, v_team_member_id);
  END IF;

  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'status_changed', OLD.status::text, NEW.status::text, v_team_member_id);
  END IF;

  -- Log priority change
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'priority_changed', OLD.priority, NEW.priority, v_team_member_id);
  END IF;

  -- Log assigned_to change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'assignee_changed', OLD.assigned_to::text, NEW.assigned_to::text, v_team_member_id);
  END IF;

  -- Log due_date change
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'due_date_changed', OLD.due_date::text, NEW.due_date::text, v_team_member_id);
  END IF;

  -- Log client_id change
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'client_changed', OLD.client_id::text, NEW.client_id::text, v_team_member_id);
  END IF;

  -- Log type change
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'type_changed', OLD.type::text, NEW.type::text, v_team_member_id);
  END IF;

  -- Log contract_id change
  IF OLD.contract_id IS DISTINCT FROM NEW.contract_id THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'contract_changed', OLD.contract_id::text, NEW.contract_id::text, v_team_member_id);
  END IF;

  -- Log contract_module_id change
  IF OLD.contract_module_id IS DISTINCT FROM NEW.contract_module_id THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'module_changed', OLD.contract_module_id::text, NEW.contract_module_id::text, v_team_member_id);
  END IF;

  -- Log description changes
  IF OLD.description_objective IS DISTINCT FROM NEW.description_objective THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'objective_changed', LEFT(OLD.description_objective, 100), LEFT(NEW.description_objective, 100), v_team_member_id);
  END IF;

  IF OLD.description_notes IS DISTINCT FROM NEW.description_notes THEN
    INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'notes_changed', LEFT(OLD.description_notes, 100), LEFT(NEW.description_notes, 100), v_team_member_id);
  END IF;

  -- Log archived_at change
  IF OLD.archived_at IS DISTINCT FROM NEW.archived_at THEN
    IF NEW.archived_at IS NOT NULL THEN
      INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
      VALUES (NEW.id, 'archived', NULL, 'true', v_team_member_id);
    ELSE
      INSERT INTO public.task_history (task_id, action_type, old_value, new_value, performed_by)
      VALUES (NEW.id, 'unarchived', 'true', NULL, v_team_member_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER trigger_log_task_history
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_history();