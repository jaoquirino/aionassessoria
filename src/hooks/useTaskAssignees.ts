import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TeamMember } from "@/types/tasks";
 
export interface TaskAssignee {
  id: string;
  task_id: string;
  team_member_id: string;
  created_at: string;
  team_member?: TeamMember;
}

// Fetch all assignees for tasks (bulk fetch for task list)
export function useTasksAssignees(taskIds: string[]) {
  return useQuery({
    queryKey: ["task_assignees", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return {};

      const { data, error } = await supabase
        .from("task_assignees")
        .select("*")
        .in("task_id", taskIds);

      if (error) throw error;

      // Fetch team members
      const memberIds = [...new Set(data?.map((a) => a.team_member_id) || [])];
      const { data: members } = await supabase
        .from("team_members_public")
        .select("*")
        .in("id", memberIds);

      const membersMap = new Map(members?.map((m) => [m.id, m]) || []);

      // Group by task_id
      const result: Record<string, TaskAssignee[]> = {};
      data?.forEach((assignee) => {
        if (!result[assignee.task_id]) {
          result[assignee.task_id] = [];
        }
        result[assignee.task_id].push({
          ...assignee,
          team_member: membersMap.get(assignee.team_member_id) as TeamMember | undefined,
        });
      });

      return result;
    },
    enabled: taskIds.length > 0,
  });
}
 
 // Fetch assignees for a single task
 export function useTaskAssignees(taskId: string | null) {
   return useQuery({
     queryKey: ["task_assignees", taskId],
     queryFn: async () => {
       if (!taskId) return [];
 
       const { data, error } = await supabase
         .from("task_assignees")
         .select("*")
         .eq("task_id", taskId);
 
       if (error) throw error;
 
       // Fetch team members
       const memberIds = data?.map(a => a.team_member_id) || [];
       if (memberIds.length === 0) return [];
 
       const { data: members } = await supabase
         .from("team_members_public")
         .select("*")
         .in("id", memberIds);
 
       const membersMap = new Map(members?.map(m => [m.id, m]) || []);
 
       return data?.map(assignee => ({
         ...assignee,
         team_member: membersMap.get(assignee.team_member_id) as TeamMember | undefined,
       })) || [];
     },
     enabled: !!taskId,
   });
 }
 
 // Add assignee to task
 export function useAddTaskAssignee() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ taskId, memberId }: { taskId: string; memberId: string }) => {
       const { data, error } = await supabase
         .from("task_assignees")
         .insert({ task_id: taskId, team_member_id: memberId })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });
 }
 
 // Remove assignee from task
 export function useRemoveTaskAssignee() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ taskId, memberId }: { taskId: string; memberId: string }) => {
       const { error } = await supabase
         .from("task_assignees")
         .delete()
         .eq("task_id", taskId)
         .eq("team_member_id", memberId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });
 }
 
 // Set multiple assignees (replace all)
 export function useSetTaskAssignees() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ taskId, memberIds }: { taskId: string; memberIds: string[] }) => {
       // Delete existing
       await supabase
         .from("task_assignees")
         .delete()
         .eq("task_id", taskId);
 
       // Insert new if any
       if (memberIds.length > 0) {
         const { error } = await supabase
           .from("task_assignees")
           .insert(memberIds.map(memberId => ({
             task_id: taskId,
             team_member_id: memberId,
           })));
 
         if (error) throw error;
       }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });
 }
