import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, X, MessageSquare, FileText, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { playMentionSound } from "@/lib/notificationSound";

interface MentionToast {
  id: string;
  title: string;
  message: string;
  task_id: string;
  type: "comment" | "description" | "assignment";
  created_at: string;
}

export function MentionNotificationContainer() {
  const [toasts, setToasts] = useState<MentionToast[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let teamMemberName: string | null = null;
    let teamMemberId: string | null = null;

    const getTeamMemberInfo = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();
      teamMemberName = data?.name || null;
      teamMemberId = data?.id || null;
    };

    getTeamMemberInfo();

    const channel = supabase
      .channel("mention_notifications")
      // Listen for new comments with mentions
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments" },
        async (payload) => {
          if (!teamMemberName) return;
          const newComment = payload.new as any;

          // Don't notify for own comments
          if (newComment.user_id === user.id) return;

          // Check if the comment mentions the current user
          if (!newComment.content?.includes(`@${teamMemberName}`)) return;

          // Get the task title
          const { data: task } = await supabase
            .from("tasks")
            .select("title")
            .eq("id", newComment.task_id)
            .maybeSingle();

          // Get commenter name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newComment.user_id)
            .maybeSingle();

          const toast: MentionToast = {
            id: `mention-comment-${Date.now()}`,
            title: "Você foi mencionado em um comentário",
            message: `${profile?.full_name || "Alguém"} mencionou você na tarefa "${task?.title || "..."}"`,
            task_id: newComment.task_id,
            type: "comment",
            created_at: new Date().toISOString(),
          };

          playMentionSound();
          setToasts((prev) => [...prev, toast]);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      // Listen for task description updates with mentions
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          if (!teamMemberName || !teamMemberId) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Check description fields for new mentions
          const descFields = [
            "description_notes",
            "description_objective",
            "description_deliverable",
            "description_references",
          ] as const;

          for (const field of descFields) {
            const oldVal: string = oldData[field] || "";
            const newVal: string = newData[field] || "";

            // Only notify if mention was just added
            if (
              newVal.includes(`@${teamMemberName}`) &&
              !oldVal.includes(`@${teamMemberName}`)
            ) {
              const toast: MentionToast = {
                id: `mention-desc-${Date.now()}-${field}`,
                title: "Você foi mencionado em uma tarefa",
                message: `Alguém mencionou você na descrição da tarefa "${newData.title || "..."}"`,
                task_id: newData.id,
                type: "description",
                created_at: new Date().toISOString(),
              };

              playMentionSound();
              setToasts((prev) => [...prev, toast]);
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              break; // One notification per update
            }
          }

          // Check for assignment changes
          if (
            newData.assigned_to === teamMemberId &&
            oldData.assigned_to !== teamMemberId
          ) {
            // Already handled by existing NotificationToastContainer, skip
          }
        }
      )
      // Listen for new task_assignees (multi-assignee)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_assignees" },
        async (payload) => {
          if (!teamMemberId) return;
          const newAssignee = payload.new as any;

          if (newAssignee.team_member_id !== teamMemberId) return;

          // Get the task title
          const { data: task } = await supabase
            .from("tasks")
            .select("title")
            .eq("id", newAssignee.task_id)
            .maybeSingle();

          const toast: MentionToast = {
            id: `mention-assign-${Date.now()}`,
            title: "Você foi atribuído a uma tarefa",
            message: `Você foi adicionado à tarefa "${task?.title || "..."}"`,
            task_id: newAssignee.task_id,
            type: "assignment",
            created_at: new Date().toISOString(),
          };

          playMentionSound();
          setToasts((prev) => [...prev, toast]);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigate = (toast: MentionToast) => {
    const tab = toast.type === "comment" ? "comments" : "details";
    navigate(`/tarefas?task=${toast.task_id}&tab=${tab}`);
    removeToast(toast.id);
  };

  const getIcon = (type: MentionToast["type"]) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "description":
        return <FileText className="h-4 w-4" />;
      case "assignment":
        return <UserCheck className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-card border border-border rounded-lg shadow-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors group"
            onClick={() => handleNavigate(toast)}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <AtSign className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getIcon(toast.type)}
                  <p className="text-sm font-semibold text-foreground truncate">
                    {toast.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {toast.message}
                </p>
                <p className="text-xs text-primary mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Clique para abrir →
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Auto-dismiss after 10 seconds */}
            <AutoDismiss id={toast.id} onDismiss={removeToast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AutoDismiss({ id, onDismiss }: { id: string; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 10000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);
  return null;
}
