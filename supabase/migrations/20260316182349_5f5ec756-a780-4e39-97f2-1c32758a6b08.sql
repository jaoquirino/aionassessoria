UPDATE public.tasks
SET status = 'done'
WHERE parent_task_id IS NOT NULL
  AND status != 'done'
  AND archived_at IS NULL
  AND parent_task_id IN (
    SELECT id FROM public.tasks WHERE status = 'done'
  );