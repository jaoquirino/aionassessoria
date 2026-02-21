import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, MessageSquare, FileText, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { playMentionSound } from "@/lib/notificationSound";

interface MentionToast {
  id: string;
  dbId?: string; // ID from the notifications table
  label: string;
  detail: string;
  task_id: string;
  type: "comment" | "description" | "assignment";
}

const typeConfig = {
  comment: { icon: MessageSquare, label: "Comentário" },
  description: { icon: FileText, label: "Descrição" },
  assignment: { icon: UserPlus, label: "Atribuição" },
} as const;

// Module-level deduplication set — survives React StrictMode double-mount
const recentlyInserted = new Set<string>();
const dedupeKey = (taskId: string, type: string) => `${taskId}:${type}`;

export function MentionNotificationContainer() {
  const [toasts, setToasts] = useState<MentionToast[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const tryInsert = async (taskId: string, type: string, title: string, detail: string): Promise<string | undefined> => {
      const key = dedupeKey(taskId, type);
      if (recentlyInserted.has(key)) return undefined;
      recentlyInserted.add(key);
      // Auto-clean after 5 seconds
      setTimeout(() => recentlyInserted.delete(key), 5000);

      const { data: inserted } = await supabase.from("notifications").insert({
        user_id: user.id,
        type,
        title,
        detail,
        task_id: taskId,
      }).select("id").single();
      return inserted?.id;
    };

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments" },
        async (payload) => {
          if (!teamMemberName) return;
          const c = payload.new as any;
          if (c.user_id === user.id) return;
          if (!c.content?.includes(`@${teamMemberName}`)) return;

          const [{ data: task }, { data: profile }] = await Promise.all([
            supabase.from("tasks").select("title").eq("id", c.task_id).maybeSingle(),
            supabase.from("profiles").select("full_name").eq("user_id", c.user_id).maybeSingle(),
          ]);

          const label = `${profile?.full_name || "Alguém"} mencionou você`;
          const detail = task?.title || "Tarefa";

          const dbId = await tryInsert(c.task_id, "comment", label, detail);
          if (!dbId) return; // duplicate, skip

          playMentionSound();
          setToasts((prev) => [...prev, {
            id: `mc-${Date.now()}`,
            dbId,
            label, detail, task_id: c.task_id, type: "comment",
          }]);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        async (payload) => {
          if (!teamMemberName || !teamMemberId) return;
          const n = payload.new as any;
          const o = payload.old as any;

          for (const f of ["description_notes", "description_objective", "description_deliverable", "description_references"] as const) {
            const ov: string = o[f] || "";
            const nv: string = n[f] || "";
            if (nv.includes(`@${teamMemberName}`) && !ov.includes(`@${teamMemberName}`)) {
              const label = "Você foi mencionado na descrição";
              const detail = n.title || "Tarefa";

              const dbId = await tryInsert(n.id, "description", label, detail);
              if (!dbId) return;

              playMentionSound();
              setToasts((prev) => [...prev, {
                id: `md-${Date.now()}`,
                dbId,
                label, detail, task_id: n.id, type: "description",
              }]);
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              break;
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_assignees" },
        async (payload) => {
          if (!teamMemberId) return;
          const a = payload.new as any;
          if (a.team_member_id !== teamMemberId) return;

          const { data: task } = await supabase
            .from("tasks")
            .select("title")
            .eq("id", a.task_id)
            .maybeSingle();

          const label = "Você foi atribuído a uma tarefa";
          const detail = task?.title || "Tarefa";

          const dbId = await tryInsert(a.task_id, "assignment", label, detail);
          if (!dbId) return;

          playMentionSound();
          setToasts((prev) => [...prev, {
            id: `ma-${Date.now()}`,
            dbId,
            label, detail, task_id: a.task_id, type: "assignment",
          }]);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClick = useCallback(
    async (t: MentionToast) => {
      // Mark as read in DB
      if (t.dbId) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", t.dbId);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      const tab = t.type === "comment" ? "comments" : "details";
      navigate(`/tarefas?task=${t.task_id}&tab=${tab}`);
      removeToast(t.id);
    },
    [navigate, removeToast, queryClient]
  );

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const cfg = typeConfig[t.type];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -60, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="pointer-events-auto flex items-center gap-2.5 bg-card border border-border rounded-md shadow-md px-3 py-2.5 cursor-pointer max-w-[320px]"
              onClick={() => handleClick(t)}
            >
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight truncate">
                  {t.label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                  {cfg.label} · {t.detail}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <AutoDismiss id={t.id} onDismiss={removeToast} />
            </motion.div>
          );
        })}
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
