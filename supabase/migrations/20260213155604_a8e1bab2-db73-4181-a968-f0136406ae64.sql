-- Add deliverable_type column to tasks (for design module tasks: 'arte' or 'video')
ALTER TABLE public.tasks ADD COLUMN deliverable_type text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.deliverable_type IS 'Type of deliverable for design tasks: arte or video';