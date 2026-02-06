import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle2, AlertCircle, Info, Clock, User, ExternalLink, Trash2 } from "lucide-react";
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

interface Notification {
  id: string;
  type: "task_assigned" | "task_due" | "task_completed" | "mention" | "info";
  title: string;
  message: string;
  task_id?: string;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATIONS_STORAGE_KEY = "lovable_notifications_read";
const NOTIFICATIONS_CLEARED_KEY = "lovable_notifications_cleared";

function getReadNotificationIds(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadNotificationIds(ids: Set<string>) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([...ids]));
}

function getClearedTimestamp(): string | null {
  return localStorage.getItem(NOTIFICATIONS_CLEARED_KEY);
}

function setClearedTimestamp() {
  localStorage.setItem(NOTIFICATIONS_CLEARED_KEY, new Date().toISOString());
}

// Toast notification for real-time alerts
export function ToastNotification({
  notification,
  onClose,
  onNavigate,
}: {
  notification: Notification;
  onClose: () => void;
  onNavigate: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case "task_assigned":
        return <User className="h-5 w-5 text-info" />;
      case "task_due":
        return <Clock className="h-5 w-5 text-warning" />;
      case "task_completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "mention":
        return <AlertCircle className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100, y: 0 }}
      className="bg-card border rounded-lg shadow-lg p-4 w-80"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                onNavigate();
                onClose();
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
        <button
          className="shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-accent transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// Hook to fetch notifications
function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teamMember) return [];

      const { data: assignedTasks } = await supabase
        .from("tasks")
        .select("id, title, assigned_to, created_at")
        .eq("assigned_to", teamMember.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const notifications: Notification[] = (assignedTasks || []).map((task) => ({
        id: task.id,
        type: "task_assigned" as const,
        title: "Nova tarefa atribuída",
        message: task.title,
        task_id: task.id,
        is_read: false,
        created_at: task.created_at,
      }));

      return notifications;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

// Main notification bell component
export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds());
  const [clearedAt, setClearedAt] = useState<string | null>(() => getClearedTimestamp());

  const visibleNotifications = notifications.filter((n) => {
    if (!clearedAt) return true;
    return new Date(n.created_at) > new Date(clearedAt);
  });

  const unreadCount = visibleNotifications.filter((n) => !readIds.has(n.id)).length;

  const handleNotificationClick = (notification: Notification) => {
    const newReadIds = new Set([...readIds, notification.id]);
    setReadIds(newReadIds);
    saveReadNotificationIds(newReadIds);
    if (notification.task_id) {
      navigate(`/tarefas?task=${notification.task_id}`);
    }
    setOpen(false);
  };

  const markAllAsRead = () => {
    const allIds = new Set(visibleNotifications.map((n) => n.id));
    setReadIds(allIds);
    saveReadNotificationIds(allIds);
  };

  const clearAllNotifications = () => {
    setClearedTimestamp();
    setClearedAt(new Date().toISOString());
    setReadIds(new Set());
    saveReadNotificationIds(new Set());
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "task_assigned":
        return <User className="h-4 w-4 text-info" />;
      case "task_due":
        return <Clock className="h-4 w-4 text-warning" />;
      case "task_completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "mention":
        return <AlertCircle className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            className="relative flex items-center justify-center h-9 w-9 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 focus:outline-none"
          >
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
              <Badge
                variant="destructive"
                className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {/* Header - fixed */}
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Marcar lidas
            </Button>
          )}
        </div>

        {/* Scrollable list */}
        <ScrollArea className="max-h-72">
          {visibleNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {visibleNotifications.map((notification) => {
                const isRead = readIds.has(notification.id);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-accent/50 transition-colors flex gap-3",
                      !isRead && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !isRead && "font-medium")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {!isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer - fixed, red clear button */}
        {visibleNotifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={clearAllNotifications}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Toast container for displaying real-time notifications
export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let teamMemberId: string | null = null;

    const getTeamMemberId = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      teamMemberId = data?.id || null;
    };

    getTeamMemberId();

    const channel = supabase
      .channel("task_assignments")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          if (!teamMemberId) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData.assigned_to === teamMemberId && oldData.assigned_to !== teamMemberId) {
            const notification: Notification = {
              id: `toast-${Date.now()}`,
              type: "task_assigned",
              title: "Nova tarefa atribuída a você",
              message: newData.title,
              task_id: newData.id,
              is_read: false,
              created_at: new Date().toISOString(),
            };
            setToasts((prev) => [...prev, notification]);
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          if (!teamMemberId) return;
          const newData = payload.new as any;
          if (newData.assigned_to === teamMemberId) {
            const notification: Notification = {
              id: `toast-${Date.now()}`,
              type: "task_assigned",
              title: "Nova tarefa atribuída a você",
              message: newData.title,
              task_id: newData.id,
              is_read: false,
              created_at: new Date().toISOString(),
            };
            setToasts((prev) => [...prev, notification]);
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
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

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            notification={toast}
            onClose={() => removeToast(toast.id)}
            onNavigate={() => {
              if (toast.task_id) {
                navigate(`/tarefas?task=${toast.task_id}`);
              }
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
