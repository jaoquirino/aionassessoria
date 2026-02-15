import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedColor {
  id: string;
  hex: string;
  label: string | null;
  order_index: number;
}

export function useSavedColors() {
  return useQuery({
    queryKey: ["saved_colors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_colors")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as SavedColor[];
    },
  });
}

export function useAddSavedColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { hex: string; label?: string; order_index: number }) => {
      const { error } = await supabase.from("saved_colors").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_colors"] });
      toast.success("Cor salva na paleta");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSavedColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hex, label }: { id: string; hex: string; label?: string }) => {
      const { error } = await supabase.from("saved_colors").update({ hex, label }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_colors"] });
      toast.success("Cor atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteSavedColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_colors"] });
      toast.success("Cor removida da paleta");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
