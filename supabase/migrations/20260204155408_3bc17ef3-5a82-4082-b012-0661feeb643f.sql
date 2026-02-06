-- Fix security issues: Ensure all RLS policies explicitly require authentication
-- This addresses: team_members_email_exposure, team_members_public_view_exposure, clients_business_data_exposure

-- ============================================
-- 1. FIX: team_members table policies
-- ============================================

-- Drop existing SELECT policies and recreate with explicit auth check
DROP POLICY IF EXISTS "Admins can view all team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated team members can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own team_member record" ON public.team_members;

-- Create single consolidated policy requiring authentication
CREATE POLICY "Team members can view team_members (authenticated only)" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_team_member(auth.uid())
    OR email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
  )
);

-- ============================================
-- 2. FIX: clients table policies
-- ============================================

-- Drop and recreate SELECT policy with explicit auth check
DROP POLICY IF EXISTS "Team members can view clients" ON public.clients;

CREATE POLICY "Team members can view clients (authenticated only)" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member(auth.uid())
);

-- ============================================
-- 3. VERIFY: team_members_public view
-- The view uses security_invoker=on so it inherits
-- the fixed policies from team_members table.
-- No additional action needed for the view itself.
-- ============================================