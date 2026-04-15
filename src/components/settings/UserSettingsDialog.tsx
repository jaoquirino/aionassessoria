import { useState, useEffect, useMemo } from "react";
import { Pencil, Key, Loader2, ShieldCheck, Shield, UserX, Save, X, EyeOff, Eye, Trash2, Plus, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import {
  ALL_MODULES,
  DASHBOARD_SUB_PERMISSIONS,
  useUserModulePermissions,
  useBulkSetModulePermissions,
} from "@/hooks/useModulePermissions";
import { useFreelancerRates, useUpsertFreelancerRate, useDeleteFreelancerRate } from "@/hooks/useFreelancerRates";
import { useAllModules } from "@/hooks/useModules";
import { useAllModuleDeliverableTypes } from "@/hooks/useModuleDeliverableTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UserSettingsDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onRoleChange: (userId: string, role: string, teamConfig?: { roles?: string; capacityLimit?: number; restrictedView?: boolean }) => void;
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Team member fields
  const [teamRoles, setTeamRoles] = useState<string[]>([]);
  const [capacityLimit, setCapacityLimit] = useState(15);
  const [restrictedView, setRestrictedView] = useState(false);
  const [isSavingTeamFields, setIsSavingTeamFields] = useState(false);

  const isPendingApproval = (user as any)?._pendingApproval === true;

  useEffect(() => {
    if (user) {
      if (isPendingApproval) {
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
    setIsResettingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida");

      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Senha resetada. O usuário deverá criar uma nova senha no próximo login.");
    } catch (error: any) {
      toast.error("Erro ao resetar senha: " + error.message);
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

  const originalRoles = user.team_roles?.split(",").map(r => r.trim()).filter(Boolean) || [];
  const teamFieldsChanged =
    JSON.stringify(teamRoles.sort()) !== JSON.stringify([...originalRoles].sort()) ||
    capacityLimit !== (user.capacity_limit ?? 15) ||
    restrictedView !== (user.restricted_view ?? false);

  const isAdmin = user.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Usuário</DialogTitle>
        </DialogHeader>

        {/* User Info header */}
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
              @{user.username || "sem_username"}
            </p>
          </div>
        </div>

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

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1 text-xs">Geral</TabsTrigger>
            {!isAdmin && user.role && (
              <TabsTrigger value="modules" className="flex-1 text-xs">Módulos</TabsTrigger>
            )}
            {user.team_member_id && (
              <TabsTrigger value="rates" className="flex-1 text-xs">Valores</TabsTrigger>
            )}
          </TabsList>

          {/* ========== GENERAL TAB ========== */}
          <TabsContent value="general" className="space-y-5 mt-0">
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
                onValueChange={(value) => {
                  const config = {
                    roles: teamRoles.length > 0 ? teamRoles.join(", ") : undefined,
                    capacityLimit,
                    restrictedView,
                  };
                  onRoleChange(user.id, value, config);
                }}
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
                  <SelectItem value="gestor">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Gestor de Equipe
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

            {/* Team Member Fields */}
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Senha</Label>
              <p className="text-xs text-muted-foreground">
                Ao resetar, a senha atual é invalidada e o usuário deverá criar uma nova senha no próximo login.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full" disabled={isResettingPassword}>
                    {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    Resetar senha
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A senha de <strong>{user.full_name || user.username}</strong> será invalidada.
                      No próximo login, será solicitada uma nova senha.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPassword}>
                      Confirmar reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
          </TabsContent>

          {/* ========== MODULES TAB ========== */}
          {!isAdmin && user.role && (
            <TabsContent value="modules" className="mt-0">
              <ModulePermissionsSection userId={user.id} userPermission={user.permission || (user.role === "gestor" ? "gestor" : "operational")} />
            </TabsContent>
          )}

          {/* ========== RATES TAB ========== */}
          {user.team_member_id && (
            <TabsContent value="rates" className="mt-0">
              <ProductionRatesSection teamMemberId={user.team_member_id} userName={user.full_name || user.username || ""} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ========== Module Permissions Section (inline) ========== */
function getDefaultModuleAccess(permission: string, moduleKey: string): boolean {
  if (permission === "admin") return true;
  if (permission === "gestor") {
    return ["dashboard", "tasks", "calendar", "team"].includes(moduleKey);
  }
  // operational
  return ["dashboard", "tasks"].includes(moduleKey);
}

function ModulePermissionsSection({ userId, userPermission }: { userId: string; userPermission: string }) {
  const { data: existingPerms = [], isLoading } = useUserModulePermissions(userId);
  const bulkSet = useBulkSetModulePermissions();

  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [dashboardSubs, setDashboardSubs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const states: Record<string, boolean> = {};
    const subs: Record<string, boolean> = {};

    ALL_MODULES.forEach((m) => {
      const perm = existingPerms.find((p) => p.module === m.key);
      // Use role-based default when no explicit permission exists
      states[m.key] = perm ? perm.can_access : getDefaultModuleAccess(userPermission, m.key);
    });

    const dashPerm = existingPerms.find((p) => p.module === "dashboard");
    DASHBOARD_SUB_PERMISSIONS.forEach((s) => {
      const val = dashPerm?.sub_permissions?.[s.key];
      subs[s.key] = val !== false;
    });

    setModuleStates(states);
    setDashboardSubs(subs);
  }, [existingPerms, userPermission]);

  const handleSave = () => {
    const permissions = ALL_MODULES.map((m) => ({
      module: m.key,
      can_access: moduleStates[m.key] ?? true,
      sub_permissions: m.key === "dashboard" ? dashboardSubs : {},
    }));
    bulkSet.mutate({ userId, permissions });
  };

  const hasChanges = () => {
    for (const m of ALL_MODULES) {
      const perm = existingPerms.find((p) => p.module === m.key);
      const currentVal = moduleStates[m.key] ?? getDefaultModuleAccess(userPermission, m.key);
      const originalVal = perm ? perm.can_access : getDefaultModuleAccess(userPermission, m.key);
      if (currentVal !== originalVal) return true;
    }
    const dashPerm = existingPerms.find((p) => p.module === "dashboard");
    for (const s of DASHBOARD_SUB_PERMISSIONS) {
      const currentVal = dashboardSubs[s.key] ?? true;
      const originalVal = dashPerm?.sub_permissions?.[s.key] !== false;
      if (currentVal !== originalVal) return true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Module access toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Acesso aos Módulos</CardTitle>
          <CardDescription>Ative ou desative o acesso a cada módulo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_MODULES.map((m) => (
            <div key={m.key} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
              <Switch
                checked={moduleStates[m.key] ?? true}
                onCheckedChange={(v) => setModuleStates((prev) => ({ ...prev, [m.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dashboard sub-permissions */}
      {(moduleStates["dashboard"] ?? true) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visibilidade no Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DASHBOARD_SUB_PERMISSIONS.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1">
                <p className="text-sm">{s.label}</p>
                <Switch
                  checked={dashboardSubs[s.key] ?? true}
                  onCheckedChange={(v) => setDashboardSubs((prev) => ({ ...prev, [s.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hasChanges() && (
        <Button onClick={handleSave} disabled={bulkSet.isPending} className="w-full gap-2">
          {bulkSet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar permissões
        </Button>
      )}
    </div>
  );
}

/* ========== Production Rates Section (inline) ========== */
function ProductionRatesSection({ teamMemberId }: { teamMemberId: string }) {
  const [newModuleId, setNewModuleId] = useState("");
  const [newDeliverableType, setNewDeliverableType] = useState("");
  const [customType, setCustomType] = useState("");
  const [newRate, setNewRate] = useState(0);

  const { data: rates = [], isLoading } = useFreelancerRates(teamMemberId);
  const { data: modules = [] } = useAllModules();
  const { data: allDeliverableTypes = [] } = useAllModuleDeliverableTypes();
  const upsertRate = useUpsertFreelancerRate();
  const deleteRate = useDeleteFreelancerRate();

  const activeModules = modules.filter(m => m.is_active);

  // Get deliverable types for the selected module
  const moduleDeliverableTypes = useMemo(() => {
    if (!newModuleId) return [];
    return allDeliverableTypes.filter(dt => dt.module_id === newModuleId).map(dt => dt.name);
  }, [newModuleId, allDeliverableTypes]);

  const handleAdd = async () => {
    if (!newModuleId || newRate <= 0) return;
    const deliverableType = newDeliverableType === "__custom" ? customType.trim() : (newDeliverableType && newDeliverableType !== "__none" ? newDeliverableType : null);
    await upsertRate.mutateAsync({
      team_member_id: teamMemberId,
      module_id: newModuleId,
      deliverable_type: deliverableType || null,
      rate_per_unit: newRate,
    });
    setNewModuleId("");
    setNewDeliverableType("");
    setCustomType("");
    setNewRate(0);
  };

  const handleDelete = async (rateId: string) => {
    await deleteRate.mutateAsync({ id: rateId, teamMemberId });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina o valor por peça produzida. Deixe em branco ou R$ 0 se não houver valor.
      </p>

      {/* Existing rates */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/20">
          Nenhum valor configurado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {rates.map((rate) => (
            <div key={rate.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{rate.module?.name || "Módulo"}</p>
                {rate.deliverable_type && (
                  <Badge variant="outline" className="text-xs mt-0.5">{rate.deliverable_type}</Badge>
                )}
              </div>
              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                R$ {Number(rate.rate_per_unit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleDelete(rate.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new rate */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium">Adicionar valor</p>

        <div className="space-y-2">
          <Label className="text-xs">Módulo *</Label>
          <Select value={newModuleId} onValueChange={setNewModuleId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecionar módulo" />
            </SelectTrigger>
            <SelectContent>
              {activeModules.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tipo de entrega (opcional)</Label>
          <Select value={newDeliverableType} onValueChange={setNewDeliverableType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Módulo inteiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Módulo inteiro</SelectItem>
              {existingTypes.map((dt) => (
                <SelectItem key={dt} value={dt}>{dt}</SelectItem>
              ))}
              <SelectItem value="__custom">Outro (digitar)</SelectItem>
            </SelectContent>
          </Select>
          {newDeliverableType === "__custom" && (
            <Input
              placeholder="Digite o tipo de entrega"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="h-9"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Valor por peça *</Label>
          <CurrencyInput value={newRate} onChange={setNewRate} />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!newModuleId || newRate <= 0 || upsertRate.isPending || (newDeliverableType === "__custom" && !customType.trim())}
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
