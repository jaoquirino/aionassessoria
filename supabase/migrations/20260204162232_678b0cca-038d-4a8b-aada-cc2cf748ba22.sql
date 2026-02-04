-- Ensure proper authentication on all data access
-- This is a comprehensive fix for all 3 error-level issues

-- ============================================
-- 1. FIX: clients table - add explicit auth check
-- ============================================

-- First drop any existing SELECT policy on clients
DROP POLICY IF EXISTS "Team members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Team members can view clients (authenticated only)" ON public.clients;

-- Create policy with explicit auth check
CREATE POLICY "Authenticated team members can view clients" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member(auth.uid())
);

-- ============================================
-- 2. FIX: team_members table - consolidate SELECT policies
-- ============================================

-- Drop all SELECT policies first to avoid duplicates
DROP POLICY IF EXISTS "Admins can view all team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated team members can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own team_member record" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team_members (authenticated only)" ON public.team_members;

-- Create single consolidated policy with explicit auth
CREATE POLICY "Authenticated users can view team_members" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_team_member(auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);