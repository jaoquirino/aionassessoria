-- Fix task_attachments RLS policies to allow team members to insert
-- Drop the restrictive policy and recreate as permissive

DROP POLICY IF EXISTS "Team members can insert task_attachments" ON public.task_attachments;

CREATE POLICY "Team members can insert task_attachments"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (is_team_member(auth.uid()));