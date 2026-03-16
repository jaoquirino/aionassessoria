-- Reforça a regra: subtarefa não pode ficar aberta se a tarefa pai estiver concluída
CREATE OR REPLACE FUNCTION public.sync_subtask_status_with_parent_done()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent_status public.task_status;
BEGIN
  -- Só aplica para subtarefas
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.status
  INTO _parent_status
  FROM public.tasks t
  WHERE t.id = NEW.parent_task_id;

  -- Se o pai está concluído, força a subtarefa como concluída
  IF _parent_status = 'done' THEN
    NEW.status := 'done';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_subtask_status_with_parent_done ON public.tasks;

CREATE TRIGGER trigger_sync_subtask_status_with_parent_done
BEFORE INSERT OR UPDATE OF parent_task_id, status
ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_subtask_status_with_parent_done();