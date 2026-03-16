import { useState, useEffect } from "react";
import { Pencil, Key, Loader2, ShieldCheck, Shield, UserX, Save, X, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type UserWithRole, type AppRole } from "@/hooks/useUserRoles";
import { useRoleNames } from "@/hooks/useAvailableRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { strongPasswordSchema, getPasswordRequirements } from "@/lib/passwordValidation";
import { useQueryClient } from "@tanstack/react-query";

interface UserSettingsDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onRoleChange: (userId: string, role: string) => void;
  onDelete: (userId: string) => void;
  isDeletingUserId: string | null;
}

export function UserSettingsDialog({
  user,
  open,
  onOpenChange,
  currentUserId,
  onRoleChange,
  onDelete,
  isDeletingUserId,
}: UserSettingsDialogProps) {
  const queryClient = useQueryClient();
  const roleOptions = useRoleNames();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Team member fields
  const [teamRoles, setTeamRoles] = useState<string[]>([]);
  const [capacityLimit, setCapacityLimit] = useState(15);
  const [restrictedView, setRestrictedView] = useState(false);
  const [isSavingTeamFields, setIsSavingTeamFields] = useState(false);

  // Reset team fields when user changes
  const isPendingApproval = (user as any)?._pendingApproval === true;

  useEffect(() => {
    if (user) {
      if (isPendingApproval) {
        // Defaults for pending approval: restricted view + operational
        setTeamRoles([]);
        setCapacityLimit(15);
        setRestrictedView(true);
      } else {
        const roles = user.team_roles?.split(",").map(r => r.trim()).filter(Boolean) || [];
        setTeamRoles(roles);
        setCapacityLimit(user.capacity_limit ?? 15);
        setRestrictedView(user.restricted_view ?? false);
      }
      setIsEditingUsername(false);
      setShowResetPassword(false);
      setNewPassword("");
    }
  }, [user]);

  if (!user) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const handleStartEditUsername = () => {
    setEditedUsername(user.username || "");
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (!editedUsername.trim()) {
      toast.error("Username não pode ser vazio");
      return;
    }

    const sanitized = editedUsername.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (sanitized !== editedUsername) {
      toast.error("Username pode conter apenas letras minúsculas, números, _ e .");
      return;
    }

    setIsSavingUsername(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", sanitized)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Este username já está em uso");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: sanitized, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Username atualizado");
      setIsEditingUsername(false);
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
    } catch (error: any) {
      toast.error("Erro ao atualizar username: " + error.message);
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleResetPassword = async () => {
    const validation = strongPasswordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida");

      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: user.id, newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Senha redefinida com sucesso");
      setNewPassword("");
      setShowResetPassword(false);
    } catch (error: any) {
      toast.error("Erro ao redefinir senha: " + error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleAddRole = (role: string) => {
    if (!teamRoles.includes(role)) {
      setTeamRoles([...teamRoles, role]);
    }
  };

  const handleRemoveRole = (role: string) => {
    if (teamRoles.length > 1) {
      setTeamRoles(teamRoles.filter(r => r !== role));
    }
  };

  const handleSaveTeamFields = async () => {
    if (!user.team_member_id) return;
    setIsSavingTeamFields(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({
          role: teamRoles.join(", "),
          capacity_limit: capacityLimit,
          restricted_view: restrictedView,
        })
        .eq("id", user.team_member_id);

      if (error) throw error;

      toast.success("Configurações da equipe atualizadas");
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSavingTeamFields(false);
    }
  };

  const isSelf = user.id === currentUserId;
  const availableRoles = roleOptions.filter(r => !teamRoles.includes(r));

  // Check if team fields changed
  const originalRoles = user.team_roles?.split(",").map(r => r.trim()).filter(Boolean) || [];
  const teamFieldsChanged =
    JSON.stringify(teamRoles.sort()) !== JSON.stringify([...originalRoles].sort()) ||
    capacityLimit !== (user.capacity_limit ?? 15) ||
    restrictedView !== (user.restricted_view ?? false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Pending Approval Banner */}
          {isPendingApproval && !user.role && (
            <div className="p-3 rounded-lg border border-warning/50 bg-warning/5">
              <p className="text-sm font-medium text-warning flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Usuário aguardando aprovação
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Defina o nível de acesso e os cargos abaixo para aprovar.
              </p>
            </div>
          )}
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-lg">
                {user.full_name || "Nome não informado"}
              </p>
              <p className="text-sm text-muted-foreground">
                Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(user.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Username */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome de usuário</Label>
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  placeholder="username"
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveUsername} disabled={isSavingUsername}>
                  {isSavingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingUsername(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground font-mono bg-muted px-3 py-1.5 rounded-md flex-1">
                  @{user.username || "sem_username"}
                </span>
                <Button size="icon" variant="ghost" onClick={handleStartEditUsername} className="shrink-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Role (Access Level) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nível de acesso</Label>
            <Select
              value={user.role || "none"}
              onValueChange={(value) => onRoleChange(user.id, value)}
              disabled={isSelf}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" />
                    Administrador
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Operacional
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <UserX className="h-3 w-3" />
                    Sem acesso
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">Você não pode alterar sua própria permissão</p>
            )}
          </div>

          {/* Team Member Fields - show for existing team members or pending approval */}
          {(user.team_member_id || isPendingApproval) && (
            <>
              <Separator />

              {/* Team Roles (Cargos) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cargos</Label>
                <div className="flex flex-wrap gap-1.5">
                  {teamRoles.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum cargo definido</span>
                  )}
                  {teamRoles.map((role) => (
                    <Badge key={role} variant="secondary" className="gap-1 pr-1">
                      {role}
                      {teamRoles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {availableRoles.length > 0 && (
                  <Select onValueChange={handleAddRole}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Adicionar cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Limite de capacidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(parseInt(e.target.value) || 15)}
                  className="w-24"
                />
              </div>

              {/* Restricted View */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <EyeOff className="h-3.5 w-3.5" />
                    Visão restrita
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Só consegue ver tarefas atribuídas a ele
                  </p>
                </div>
                <Switch checked={restrictedView} onCheckedChange={setRestrictedView} />
              </div>

              {/* Save team fields button - only for existing team members */}
              {user.team_member_id && teamFieldsChanged && (
                <Button
                  size="sm"
                  onClick={handleSaveTeamFields}
                  disabled={isSavingTeamFields}
                  className="gap-1 w-full"
                >
                  {isSavingTeamFields ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar alterações da equipe
                </Button>
              )}
            </>
          )}

          <Separator />

          {/* Reset Password */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Senha</Label>
            {showResetPassword ? (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {newPassword.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {getPasswordRequirements(newPassword).map((req, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || !newPassword}
                    className="gap-1"
                  >
                    {isResettingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                    Redefinir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowResetPassword(false); setNewPassword(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowResetPassword(true)}>
                <Key className="h-4 w-4" />
                Redefinir senha
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Define uma nova senha diretamente, sem exigir a senha anterior.
            </p>
          </div>

          <Separator />

          {/* Delete User */}
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeletingUserId === user.id || isSelf}
                  className="gap-2"
                >
                  {isDeletingUserId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Excluir usuário
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove o usuário "{user.full_name || user.username}" e seus registros de acesso permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(user.id);
                      onOpenChange(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
