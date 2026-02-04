-- Add archived_at column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster archived queries
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at);

-- Update RLS policy to allow admins to view archived tasks
-- (Existing policies should already work, but let's ensure archived tasks are accessible)