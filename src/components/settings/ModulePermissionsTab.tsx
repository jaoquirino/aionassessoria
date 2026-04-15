import { useState, useEffect } from "react";
import { Loader2, Save, Shield, ShieldCheck, Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ALL_MODULES,
  DASHBOARD_SUB_PERMISSIONS,
  useUserModulePermissions,
  useBulkSetModulePermissions,
  type ModuleKey,
} from "@/hooks/useModulePermissions";
import { useUsersWithRoles, type UserWithRole } from "@/hooks/useUserRoles";

export function ModulePermissionsTab() {
  const { data: users = [], isLoading: usersLoading } = useUsersWithRoles();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Only show users with a role (admin/gestor/member)
  const activeUsers = users.filter((u) => u.role);

  const selectedUser = activeUsers.find((u) => u.id === selectedUserId) || null;

  if (usersLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-foreground mb-1">Permissões por Módulo</h3>
        <p className="text-sm text-muted-foreground">
          Configure quais módulos cada usuário pode acessar e o que pode visualizar no Dashboard
        </p>
      </div>
      <Separator />

      {/* User selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Selecionar usuário</Label>
        <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um usuário..." />
          </SelectTrigger>
          <SelectContent>
            {activeUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2">
                  <span>{u.full_name || u.username || "Sem nome"}</span>
                  <Badge variant="outline" className="text-xs">
                    {u.role === "admin" ? "Admin" : u.role === "gestor" ? "Gestor" : "Operacional"}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUser && selectedUser.role === "admin" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <strong>Administradores</strong> têm acesso total a todos os módulos. As permissões abaixo não se aplicam.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedUser && selectedUser.role !== "admin" && (
        <PermissionsEditor user={selectedUser} />
      )}

      {!selectedUser && (
        <div className="text-center text-muted-foreground py-8">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Selecione um usuário para configurar suas permissões</p>
        </div>
      )}
    </div>
  );
}

function PermissionsEditor({ user }: { user: UserWithRole }) {
  const { data: existingPerms = [], isLoading } = useUserModulePermissions(user.id);
  const bulkSet = useBulkSetModulePermissions();

  // Local state for module toggles
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [dashboardSubs, setDashboardSubs] = useState<Record<string, boolean>>({});

  // Initialize from existing permissions
  useEffect(() => {
    const states: Record<string, boolean> = {};
    const subs: Record<string, boolean> = {};

    ALL_MODULES.forEach((m) => {
      const perm = existingPerms.find((p) => p.module === m.key);
      states[m.key] = perm ? perm.can_access : true; // default true
    });

    const dashPerm = existingPerms.find((p) => p.module === "dashboard");
    DASHBOARD_SUB_PERMISSIONS.forEach((s) => {
      const val = dashPerm?.sub_permissions?.[s.key];
      subs[s.key] = val !== false; // default true
    });

    setModuleStates(states);
    setDashboardSubs(subs);
  }, [existingPerms]);

  const handleToggleModule = (key: string, value: boolean) => {
    setModuleStates((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleDashSub = (key: string, value: boolean) => {
    setDashboardSubs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const permissions = ALL_MODULES.map((m) => ({
      module: m.key,
      can_access: moduleStates[m.key] ?? true,
      sub_permissions: m.key === "dashboard" ? dashboardSubs : {},
    }));

    bulkSet.mutate({ userId: user.id, permissions });
  };

  // Check if anything changed
  const hasChanges = () => {
    for (const m of ALL_MODULES) {
      const perm = existingPerms.find((p) => p.module === m.key);
      const currentVal = moduleStates[m.key] ?? true;
      const originalVal = perm ? perm.can_access : true;
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
      {/* User header */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>
            {user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.full_name || "Sem nome"}</p>
          <Badge variant="secondary" className="text-xs">
            {user.role === "gestor" ? "Gestor de Equipe" : "Operacional"}
          </Badge>
        </div>
      </div>

      {/* Module access toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Acesso aos Módulos</CardTitle>
          <CardDescription>Ative ou desative o acesso a cada módulo do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_MODULES.map((m) => (
            <div key={m.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
              <Switch
                checked={moduleStates[m.key] ?? true}
                onCheckedChange={(v) => handleToggleModule(m.key, v)}
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
            <CardDescription>Escolha quais seções do Dashboard este usuário pode ver</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DASHBOARD_SUB_PERMISSIONS.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1.5">
                <p className="text-sm">{s.label}</p>
                <Switch
                  checked={dashboardSubs[s.key] ?? true}
                  onCheckedChange={(v) => handleToggleDashSub(s.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      {hasChanges() && (
        <Button onClick={handleSave} disabled={bulkSet.isPending} className="w-full gap-2">
          {bulkSet.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar permissões
        </Button>
      )}
    </div>
  );
}
