-- Add parent_task_id to tasks for subtask support
ALTER TABLE public.tasks 
ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for fast lookups of subtasks by parent
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Enable realtime for subtask updates (already enabled for tasks if applicable)
