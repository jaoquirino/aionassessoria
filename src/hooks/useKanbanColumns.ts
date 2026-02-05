 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 export interface KanbanColumn {
   id: string;
   key: string;
   label: string;
   color_class: string;
   order_index: number;
   is_protected: boolean;
   is_active: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export function useKanbanColumns() {
   return useQuery({
     queryKey: ["kanban_columns"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("kanban_columns")
         .select("*")
         .eq("is_active", true)
         .order("order_index", { ascending: true });
 
       if (error) throw error;
       return data as KanbanColumn[];
     },
     staleTime: 60000,
   });
 }
 
 export function useCreateKanbanColumn() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (input: { key: string; label: string; color_class?: string; order_index: number }) => {
       const { data, error } = await supabase
         .from("kanban_columns")
         .insert({
           key: input.key,
           label: input.label,
           color_class: input.color_class || "bg-muted/50 border-muted-foreground/20",
           order_index: input.order_index,
           is_protected: false,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["kanban_columns"] });
       toast.success("Coluna criada");
     },
     onError: (error) => {
       toast.error("Erro ao criar coluna: " + error.message);
     },
   });
 }
 
 export function useUpdateKanbanColumn() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, ...updates }: { id: string; label?: string; order_index?: number; color_class?: string }) => {
       const { data, error } = await supabase
         .from("kanban_columns")
         .update(updates)
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["kanban_columns"] });
     },
     onError: (error) => {
       toast.error("Erro ao atualizar coluna: " + error.message);
     },
   });
 }
 
 export function useDeleteKanbanColumn() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("kanban_columns")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["kanban_columns"] });
       toast.success("Coluna removida");
     },
     onError: (error) => {
       toast.error("Erro ao remover coluna: " + error.message);
     },
   });
 }
 
 export function useReorderKanbanColumns() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (columns: { id: string; order_index: number }[]) => {
       const updates = columns.map(({ id, order_index }) =>
         supabase
           .from("kanban_columns")
           .update({ order_index })
           .eq("id", id)
       );
       await Promise.all(updates);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["kanban_columns"] });
       toast.success("Ordem atualizada");
     },
     onError: (error) => {
       toast.error("Erro ao reordenar: " + error.message);
     },
   });
 }