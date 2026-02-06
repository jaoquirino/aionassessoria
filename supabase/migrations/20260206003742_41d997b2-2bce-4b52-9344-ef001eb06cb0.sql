-- Fix 1: Create a view for team_members that hides email and user_id
-- The existing team_members_public view already excludes sensitive fields
-- We need to update the RLS on team_members base table to restrict email access

-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Team members can view team_members" ON public.team_members;

-- Create policy that only allows admins to see all fields
-- Regular team members can only see their own record's full data
CREATE POLICY "Team members can view team_members"
ON public.team_members
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR user_id = auth.uid()
);

-- Fix 2: Restrict contracts financial data to admins only
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Team members can view contracts" ON public.contracts;

-- Create policy that restricts contract viewing to admins only
CREATE POLICY "Admins can view contracts"
ON public.contracts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));