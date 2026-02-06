-- Fix task_history RLS to allow team members to view history (not just admins)
DROP POLICY IF EXISTS "Admins can view task_history" ON public.task_history;
DROP POLICY IF EXISTS "Team members can view task_history" ON public.task_history;

CREATE POLICY "Team members can view task_history"
ON public.task_history
FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

-- Also allow team members to delete their own attachments
DROP POLICY IF EXISTS "Team members can delete task_attachments" ON public.task_attachments;

CREATE POLICY "Team members can delete task_attachments"
ON public.task_attachments
FOR DELETE
TO authenticated
USING (is_team_member(auth.uid()));

-- Allow team members to delete checklist items
DROP POLICY IF EXISTS "Admins can delete task_checklist" ON public.task_checklist;
DROP POLICY IF EXISTS "Team members can delete task_checklist" ON public.task_checklist;

CREATE POLICY "Team members can delete task_checklist"
ON public.task_checklist
FOR DELETE
TO authenticated
USING (is_team_member(auth.uid()));