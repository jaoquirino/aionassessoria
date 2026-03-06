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
 
 // Helper: build a team members map from existing assignee cache
 function getMembersMapFromCache(queryClient: ReturnType<typeof useQueryClient>): Map<string, TeamMember> {
   const membersMap = new Map<string, TeamMember>();
   const queries = queryClient.getQueriesData<Record<string, TaskAssignee[]>>({ queryKey: ["task_assignees"] });
   for (const [, data] of queries) {
     if (data && !Array.isArray(data)) {
       Object.values(data).forEach(assignees => {
         assignees.forEach(a => {
           if (a.team_member) membersMap.set(a.team_member_id, a.team_member);
         });
       });
     } else if (Array.isArray(data)) {
       (data as TaskAssignee[]).forEach(a => {
         if (a.team_member) membersMap.set(a.team_member_id, a.team_member);
       });
     }
   }
   return membersMap;
 }

 function makeOptimisticAssignee(taskId: string, memberId: string, membersMap: Map<string, TeamMember>): TaskAssignee {
   return {
     id: `temp-${memberId}`,
     task_id: taskId,
     team_member_id: memberId,
     created_at: new Date().toISOString(),
     team_member: membersMap.get(memberId),
   };
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
     onMutate: async ({ taskId, memberId }) => {
       await queryClient.cancelQueries({ queryKey: ["task_assignees"] });
       const prev = queryClient.getQueriesData({ queryKey: ["task_assignees"] });
       const membersMap = getMembersMapFromCache(queryClient);
       queryClient.setQueriesData<Record<string, TaskAssignee[]>>(
         { queryKey: ["task_assignees"] },
         (old) => {
           if (!old || Array.isArray(old)) return old;
           const existing = old[taskId] || [];
           return { ...old, [taskId]: [...existing, makeOptimisticAssignee(taskId, memberId, membersMap)] };
         }
       );
       return { prev };
     },
     onError: (_err, _vars, ctx) => {
       ctx?.prev?.forEach(([key, val]) => queryClient.setQueryData(key, val));
     },
     onSettled: () => {
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
     onMutate: async ({ taskId, memberId }) => {
       await queryClient.cancelQueries({ queryKey: ["task_assignees"] });
       const prev = queryClient.getQueriesData({ queryKey: ["task_assignees"] });
       queryClient.setQueriesData<Record<string, TaskAssignee[]>>(
         { queryKey: ["task_assignees"] },
         (old) => {
           if (!old || Array.isArray(old)) return old;
           const existing = old[taskId] || [];
           return { ...old, [taskId]: existing.filter(a => a.team_member_id !== memberId) };
         }
       );
       return { prev };
     },
     onError: (_err, _vars, ctx) => {
       ctx?.prev?.forEach(([key, val]) => queryClient.setQueryData(key, val));
     },
     onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });
 }
 
  // Set multiple assignees (diff-based to avoid false INSERT events)
  export function useSetTaskAssignees() {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({ taskId, memberIds }: { taskId: string; memberIds: string[] }) => {
        // Fetch current assignees
        const { data: current } = await supabase
          .from("task_assignees")
          .select("team_member_id")
          .eq("task_id", taskId);
        
        const currentIds = new Set((current || []).map(r => r.team_member_id));
        const desiredIds = new Set(memberIds);
        
        // Only delete removed assignees
        const toRemove = [...currentIds].filter(id => !desiredIds.has(id));
        if (toRemove.length > 0) {
          await supabase
            .from("task_assignees")
            .delete()
            .eq("task_id", taskId)
            .in("team_member_id", toRemove);
        }
        
        // Only insert truly new assignees
        const toAdd = memberIds.filter(id => !currentIds.has(id));
        if (toAdd.length > 0) {
          const { error } = await supabase
            .from("task_assignees")
            .insert(toAdd.map(memberId => ({
              task_id: taskId,
              team_member_id: memberId,
            })));
          if (error) throw error;
        }
      },
     onMutate: async ({ taskId, memberIds }) => {
       await queryClient.cancelQueries({ queryKey: ["task_assignees"] });
       const prev = queryClient.getQueriesData({ queryKey: ["task_assignees"] });
       const membersMap = getMembersMapFromCache(queryClient);
       queryClient.setQueriesData<Record<string, TaskAssignee[]>>(
         { queryKey: ["task_assignees"] },
         (old) => {
           if (!old || Array.isArray(old)) return old;
           return { ...old, [taskId]: memberIds.map(mid => makeOptimisticAssignee(taskId, mid, membersMap)) };
         }
       );
       return { prev };
     },
     onError: (_err, _vars, ctx) => {
       ctx?.prev?.forEach(([key, val]) => queryClient.setQueryData(key, val));
     },
     onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });
 }
