-- Fix: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix: Restrict task_history to admins only (sensitive audit trail)
DROP POLICY IF EXISTS "Team members can view task_history" ON public.task_history;

CREATE POLICY "Admins can view task_history" 
ON public.task_history 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix: Restrict task_attachments to task assignees, creators, or admins
DROP POLICY IF EXISTS "Team members can view task_attachments" ON public.task_attachments;

CREATE POLICY "Users can view their task attachments" 
ON public.task_attachments 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.team_members tm ON (t.assigned_to = tm.id OR t.created_by = tm.id)
    WHERE t.id = task_attachments.task_id
    AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);