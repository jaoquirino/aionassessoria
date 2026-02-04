import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle2, AlertCircle, Info, Clock, User } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    const timer = setTimeout(onClose, 6000);
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
      className="bg-card border rounded-lg shadow-lg p-4 w-80 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => {
        onNavigate();
        onClose();
      }}
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
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 -mt-1 -mr-1"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
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

      // Get the team member id for current user
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teamMember) return [];

      // Get recent tasks assigned to this user
      const { data: assignedTasks } = await supabase
        .from("tasks")
        .select("id, title, assigned_to, created_at")
        .eq("assigned_to", teamMember.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Convert to notifications format
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
export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleNotificationClick = (notification: Notification) => {
    setReadIds((prev) => new Set([...prev, notification.id]));
    if (notification.task_id) {
      navigate(`/tarefas?task=${notification.task_id}`);
    }
    setOpen(false);
  };

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
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
                      <p
                        className={cn(
                          "text-sm truncate",
                          !isRead && "font-medium"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(
                          new Date(notification.created_at),
                          "dd/MM 'às' HH:mm",
                          { locale: ptBR }
                        )}
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
      </PopoverContent>
    </Popover>
  );
}

// Toast container for displaying real-time notifications
export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime task assignments
    const channel = supabase
      .channel("task_assignments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          // Check if this is an assignment to the current user
          const { data: teamMember } = await supabase
            .from("team_members")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!teamMember) return;

          const newData = payload.new as any;
          const oldData = payload.old as any;

          // If assigned_to changed and now points to current user
          if (
            newData.assigned_to === teamMember.id &&
            oldData.assigned_to !== teamMember.id
          ) {
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
