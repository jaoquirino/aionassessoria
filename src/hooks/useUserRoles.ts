import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "admin" | "member";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: AppRole | null;
  created_at: string;
  // Team member fields
  team_member_id: string | null;
  team_roles: string | null;
  permission: string | null;
  capacity_limit: number | null;
  restricted_view: boolean | null;
  is_active: boolean | null;
}

// Check if current user is admin
export function useIsAdmin() {
  return useQuery({
    queryKey: ["is_admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

// Check if current user has any role (is team member)
export function useIsTeamMember() {
  return useQuery({
    queryKey: ["is_team_member"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

// Get all users with their roles
export function useUsersWithRoles() {
  return useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine them
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: "",
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          username: profile.username,
          role: userRole?.role as AppRole | null,
          created_at: profile.created_at,
        };
      });

      return usersWithRoles;
    },
  });
}

// Set user role and sync with team_members
export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if role exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      let roleData;
      if (existing) {
        // Update existing role
        const { data, error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        roleData = data;
      } else {
        // Insert new role
        const { data, error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role })
          .select()
          .single();

        if (error) throw error;
        roleData = data;
      }

      // Sync with team_members: reactivate or create team member
      const { data: existingTeamMember } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingTeamMember) {
        // Reactivate the team member and update permission
        await supabase
          .from("team_members")
          .update({ 
            is_active: true,
            permission: role === "admin" ? "admin" : "operational"
          })
          .eq("id", existingTeamMember.id);
      } else {
        // Get profile info to create team member
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("team_members")
            .insert({
              user_id: userId,
              name: profile.full_name || "Novo Integrante",
              role: "A definir",
              permission: role === "admin" ? "admin" : "operational",
              avatar_url: profile.avatar_url,
              is_active: true,
            });
        }
      }

      return roleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      queryClient.invalidateQueries({ queryKey: ["is_admin"] });
      queryClient.invalidateQueries({ queryKey: ["is_team_member"] });
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Permissão atualizada");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar permissão: " + error.message);
    },
  });
}

// Remove user role (set to "no access") and deactivate team member
export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Remove from user_roles
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      // Deactivate team member (instead of deleting)
      await supabase
        .from("team_members")
        .update({ is_active: false })
        .eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      queryClient.invalidateQueries({ queryKey: ["is_admin"] });
      queryClient.invalidateQueries({ queryKey: ["is_team_member"] });
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Acesso removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover permissão: " + error.message);
    },
  });
}
