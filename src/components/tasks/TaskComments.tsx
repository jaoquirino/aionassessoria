import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from "@/hooks/useTaskComments";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { data: comments, isLoading } = useTaskComments(taskId);
  const addComment = useAddTaskComment();
  const deleteComment = useDeleteTaskComment();

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    addComment.mutate(
      { taskId, content: newComment },
      {
        onSuccess: () => setNewComment(""),
      }
    );
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate({ commentId, taskId });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  // Render content with highlighted mentions
  const renderContent = (content: string) => {
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)?)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      // Every odd index is a mention match
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Comentários</h3>

      {/* Comments List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          comments?.map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex gap-3 p-3 rounded-lg",
                comment.user_id === user?.id 
                  ? "bg-primary/5 ml-6" 
                  : "bg-muted/50 mr-6"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.profile?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {comment.profile?.full_name || "Usuário"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  {comment.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDelete(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">
                  {renderContent(comment.content)}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* New Comment Form with @ mentions */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <MentionTextarea
            placeholder="Escreva um comentário... Use @ para mencionar alguém"
            value={newComment}
            onValueChange={setNewComment}
            onCtrlEnter={handleSubmit}
            className="min-h-[60px] resize-none w-full"
          />
        </div>
        <Button 
          type="button" 
          size="icon" 
          onClick={handleSubmit}
          disabled={!newComment.trim() || addComment.isPending}
          className="shrink-0 h-10 w-10"
        >
          {addComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use @ para mencionar · Ctrl+Enter para enviar
      </p>
    </div>
  );
}
