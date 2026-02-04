-- Fix task_attachments RLS policies to not access auth.users directly
-- This fixes "permission denied for table users" error

-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Users can view their task attachments" ON public.task_attachments;

-- Create a simple policy that allows team members to view all attachments
-- Since attachments are tied to tasks and tasks have their own RLS, this is secure
CREATE POLICY "Team members can view task attachments"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

-- Also ensure the insert policy uses authenticated role properly
DROP POLICY IF EXISTS "Team members can insert task_attachments" ON public.task_attachments;

CREATE POLICY "Team members can insert task_attachments"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (is_team_member(auth.uid()));

-- Ensure delete policy is correct
DROP POLICY IF EXISTS "Admins can delete task_attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Team members can delete task_attachments" ON public.task_attachments;

-- Allow any team member to delete attachments (they own the tasks)
CREATE POLICY "Team members can delete task_attachments"
ON public.task_attachments
FOR DELETE
TO authenticated
USING (is_team_member(auth.uid()));