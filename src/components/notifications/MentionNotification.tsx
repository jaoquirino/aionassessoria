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

          push({
            id: `mc-${Date.now()}`,
            label: `${profile?.full_name || "Alguém"} mencionou você`,
            detail: task?.title || "Tarefa",
            task_id: c.task_id,
            type: "comment",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          if (!teamMemberName || !teamMemberId) return;
          const n = payload.new as any;
          const o = payload.old as any;

          for (const f of ["description_notes", "description_objective", "description_deliverable", "description_references"] as const) {
            const ov: string = o[f] || "";
            const nv: string = n[f] || "";
            if (nv.includes(`@${teamMemberName}`) && !ov.includes(`@${teamMemberName}`)) {
              push({
                id: `md-${Date.now()}`,
                label: "Você foi mencionado na descrição",
                detail: n.title || "Tarefa",
                task_id: n.id,
                type: "description",
              });
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

          push({
            id: `ma-${Date.now()}`,
            label: "Você foi atribuído a uma tarefa",
            detail: task?.title || "Tarefa",
            task_id: a.task_id,
            type: "assignment",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    function push(t: MentionToast) {
      playMentionSound();
      setToasts((prev) => [...prev, t]);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [user, queryClient]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClick = useCallback(
    (t: MentionToast) => {
      const tab = t.type === "comment" ? "comments" : "details";
      navigate(`/tarefas?task=${t.task_id}&tab=${tab}`);
      removeToast(t.id);
    },
    [navigate, removeToast]
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
