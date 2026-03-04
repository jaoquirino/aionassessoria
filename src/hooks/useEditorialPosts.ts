import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EditorialPost {
  id: string;
  client_id: string;
  scheduled_date: string;
  status: string;
  social_network: string;
  content_type: string;
  title: string;
  caption: string | null;
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string } | null;
  assignee?: { id: string; name: string; avatar_url: string | null } | null;
  attachments?: EditorialPostAttachment[];
}

export interface EditorialPostAttachment {
  id: string;
  post_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export interface CreateEditorialPostInput {
  client_id: string;
  scheduled_date: string;
  social_network: string;
  content_type: string;
  title: string;
  caption?: string;
  notes?: string;
  assigned_to?: string;
  status?: string;
}

export interface UpdateEditorialPostInput extends Partial<CreateEditorialPostInput> {
  id: string;
}

export function useEditorialPosts(month?: Date) {
  return useQuery({
    queryKey: ["editorial_posts", month?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("editorial_posts")
        .select("*, client:clients(id, name), assignee:team_members!editorial_posts_assigned_to_fkey(id, name, avatar_url)")
        .order("scheduled_date", { ascending: true });

      if (month) {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        query = query
          .gte("scheduled_date", start.toISOString().split("T")[0])
          .lte("scheduled_date", end.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EditorialPost[];
    },
  });
}

export function useCreateEditorialPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEditorialPostInput) => {
      const { data: member } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();

      const { data, error } = await supabase
        .from("editorial_posts")
        .insert({ ...input, created_by: member?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorial_posts"] });
      toast.success("Postagem criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar postagem"),
  });
}

export function useUpdateEditorialPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateEditorialPostInput) => {
      const { data, error } = await supabase
        .from("editorial_posts")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorial_posts"] });
      toast.success("Postagem atualizada");
    },
    onError: () => toast.error("Erro ao atualizar postagem"),
  });
}

export function useDeleteEditorialPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("editorial_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorial_posts"] });
      toast.success("Postagem removida");
    },
    onError: () => toast.error("Erro ao remover postagem"),
  });
}

export function useUploadEditorialAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, file }: { postId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${postId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("editorial")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("editorial").getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("editorial_post_attachments")
        .insert({
          post_id: postId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorial_posts"] });
      toast.success("Arquivo enviado");
    },
    onError: () => toast.error("Erro ao enviar arquivo"),
  });
}

export function useDeleteEditorialAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("editorial_post_attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorial_posts"] });
    },
  });
}

export function useEditorialPostAttachments(postId: string | null) {
  return useQuery({
    queryKey: ["editorial_post_attachments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editorial_post_attachments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as EditorialPostAttachment[];
    },
    enabled: !!postId,
  });
}
