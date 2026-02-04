-- Remove duplicate triggers that are causing the unique constraint violation
DROP TRIGGER IF EXISTS create_onboarding_steps ON public.clients;
DROP TRIGGER IF EXISTS tr_initialize_client_onboarding ON public.clients;

-- Drop the old function that creates fixed onboarding steps
DROP FUNCTION IF EXISTS public.initialize_client_onboarding();

-- The new system uses client_module_onboarding table with dynamic templates per module
-- No automatic trigger needed - onboarding is generated when contracts with modules are saved