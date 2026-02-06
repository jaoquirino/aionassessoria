-- Create trigger to sync avatar_url from profiles to team_members
CREATE OR REPLACE FUNCTION public.sync_profile_avatar_to_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When avatar_url changes in profiles, update the linked team_member
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    UPDATE public.team_members
    SET avatar_url = NEW.avatar_url
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Also sync full_name to team_members.name
  IF OLD.full_name IS DISTINCT FROM NEW.full_name AND NEW.full_name IS NOT NULL THEN
    UPDATE public.team_members
    SET name = NEW.full_name
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_to_team_member
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_avatar_to_team_member();