DROP TRIGGER cascade_parent_task_changes_trigger ON public.tasks;

CREATE TRIGGER cascade_parent_task_changes_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.client_id IS DISTINCT FROM NEW.client_id 
     OR (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL)
     OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done'))
  EXECUTE FUNCTION public.cascade_parent_task_changes();