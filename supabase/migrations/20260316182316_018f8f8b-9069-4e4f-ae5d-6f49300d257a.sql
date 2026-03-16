CREATE OR REPLACE FUNCTION public.cascade_parent_task_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Cascade client_id change to subtasks
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    UPDATE public.tasks
    SET client_id = NEW.client_id
    WHERE parent_task_id = NEW.id;
  END IF;

  -- Cascade archive to subtasks
  IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    UPDATE public.tasks
    SET archived_at = NEW.archived_at
    WHERE parent_task_id = NEW.id
      AND archived_at IS NULL;
  END IF;

  -- Cascade done status to subtasks
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
    UPDATE public.tasks
    SET status = 'done'
    WHERE parent_task_id = NEW.id
      AND status != 'done';
  END IF;

  RETURN NEW;
END;
$function$;