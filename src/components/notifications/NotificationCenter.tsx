import { useState } from "react";
import { Bell, Trash2, MessageSquare, FileText, UserPlus, History, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface DBNotification {
  id: string;
  type: string;
  title: string;
  detail: string;
  task_id: string | null;
  is_read: boolean;
  is_cleared: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof MessageSquare> = {
  comment: MessageSquare,
  description: FileText,
  assignment: UserPlus,
};

const typeLabels: Record<string, string> = {
  comment: "Comentário",
  description: "Descrição",
  assignment: "Atribuição",
};

function useDBNotifications(showCleared: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id, showCleared],
    queryFn: async () => {
      if (!user) return [];
      const query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_cleared", showCleared)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data } = await query;
      return (data || []) as DBNotification[];
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

// Main notification bell component
export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: activeNotifications = [] } = useDBNotifications(false);
  const { data: clearedNotifications = [] } = useDBNotifications(true);

  const notifications = showHistory ? clearedNotifications : activeNotifications;
  const unreadCount = activeNotifications.filter((n) => !n.is_read).length;

  const optimistic = (
    queryKey: (string | boolean | undefined)[],
    updater: (old: DBNotification[]) => DBNotification[]
  ) => {
    queryClient.setQueryData<DBNotification[]>(queryKey, (old) => updater(old || []));
  };

  const handleNotificationClick = async (notification: DBNotification) => {
    if (!notification.is_read) {
      optimistic(["notifications", user?.id, false], (old) =>
        old.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      supabase.from("notifications").update({ is_read: true }).eq("id", notification.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
    }
    if (notification.task_id) {
      const tab = notification.type === "comment" ? "comments" : "details";
      navigate(`/tarefas?task=${notification.task_id}&tab=${tab}`);
    }
    setOpen(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    optimistic(["notifications", user.id, false], (old) =>
      old.map((n) => ({ ...n, is_read: true }))
    );
    supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_cleared", false).eq("is_read", false)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    const current = activeNotifications;
    optimistic(["notifications", user.id, false], () => []);
    optimistic(["notifications", user.id, true], (old) => [
      ...current.map((n) => ({ ...n, is_cleared: true, is_read: true })),
      ...old,
    ]);
    supabase.from("notifications").update({ is_cleared: true, is_read: true }).eq("user_id", user.id).eq("is_cleared", false)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  };

  const restoreNotification = async (id: string) => {
    const item = clearedNotifications.find((n) => n.id === id);
    if (item) {
      optimistic(["notifications", user?.id, true], (old) => old.filter((n) => n.id !== id));
      optimistic(["notifications", user?.id, false], (old) => [{ ...item, is_cleared: false }, ...old]);
    }
    supabase.from("notifications").update({ is_cleared: false }).eq("id", id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  };

  const restoreAll = async () => {
    if (!user) return;
    const items = clearedNotifications;
    optimistic(["notifications", user.id, true], () => []);
    optimistic(["notifications", user.id, false], (old) => [
      ...items.map((n) => ({ ...n, is_cleared: false })),
      ...old,
    ]);
    supabase.from("notifications").update({ is_cleared: false }).eq("user_id", user.id).eq("is_cleared", true)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowHistory(false); }}>
      <PopoverTrigger asChild>
        {compact ? (
          <button className="relative flex items-center justify-center h-9 w-9 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 focus:outline-none">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <button
            className={cn(
              "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
            )}
          >
            <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left text-sm font-medium">Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          {showHistory ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h4 className="font-medium text-sm">Histórico</h4>
            </div>
          ) : (
            <h4 className="font-medium text-sm">Notificações</h4>
          )}
          <div className="flex items-center gap-1">
            {!showHistory && unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
                Marcar lidas
              </Button>
            )}
            {showHistory && clearedNotifications.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={restoreAll}>
                <RotateCcw className="h-3 w-3" />
                Restaurar todas
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {showHistory ? "Nenhuma notificação no histórico" : "Nenhuma notificação"}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || MessageSquare;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-accent/50 transition-colors flex gap-3",
                      !notification.is_read && !showHistory && "bg-primary/5"
                    )}
                    onClick={() => !showHistory && handleNotificationClick(notification)}
                  >
                    <div className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !notification.is_read && !showHistory && "font-medium")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {typeLabels[notification.type] || notification.type} · {notification.detail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {showHistory ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreNotification(notification.id);
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground mt-1"
                        title="Restaurar"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      !notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2 flex gap-1">
          {!showHistory ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs h-8 gap-1.5"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-3.5 w-3.5" />
                Histórico
              </Button>
              {activeNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={clearAllNotifications}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar todas
                </Button>
              )}
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Toast container - kept for App.tsx import compatibility
export function NotificationToastContainer() {
  return null;
}
