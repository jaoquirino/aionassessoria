import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskComment } from "@/types/tasks";
import { toast } from "sonner";

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      // Get comments
      const { data: comments, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get unique user ids
      const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))] as string[];
      
      // Get profiles for these users
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
        }
      }

      // Combine comments with profiles
      return comments.map(comment => ({
        ...comment,
        profile: comment.user_id ? profilesMap[comment.user_id] : undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("task_comments")
        .insert({ 
          task_id: taskId, 
          content,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task_comments", variables.taskId] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar comentário: " + error.message);
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content, taskId }: { commentId: string; content: string; taskId: string }) => {
      const { data, error } = await supabase
        .from("task_comments")
        .update({ content })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return { data, taskId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["task_comments", result.taskId] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar comentário: " + error.message);
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["task_comments", result.taskId] });
    },
    onError: (error) => {
      toast.error("Erro ao excluir comentário: " + error.message);
    },
  });
}
