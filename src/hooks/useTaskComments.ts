import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskComment } from "@/types/tasks";
import { toast } from "sonner";
import { commentSchema, updateCommentSchema, getSafeErrorMessage, devLog } from "@/lib/validationSchemas";
import { z } from "zod";

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
      // Validate input
      const validated = commentSchema.parse({ taskId, content });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("task_comments")
        .insert({ 
          task_id: validated.taskId, 
          content: validated.content,
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
      devLog.error("Error adding comment:", error);
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content, taskId }: { commentId: string; content: string; taskId: string }) => {
      // Validate input
      const validated = updateCommentSchema.parse({ commentId, content, taskId });
      
      const { data, error } = await supabase
        .from("task_comments")
        .update({ content: validated.content })
        .eq("id", validated.commentId)
        .select()
        .single();

      if (error) throw error;
      return { data, taskId: validated.taskId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["task_comments", result.taskId] });
    },
    onError: (error) => {
      devLog.error("Error updating comment:", error);
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      // Validate UUIDs
      z.string().uuid().parse(commentId);
      z.string().uuid().parse(taskId);
      
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
      devLog.error("Error deleting comment:", error);
      toast.error(getSafeErrorMessage(error));
    },
  });
}
