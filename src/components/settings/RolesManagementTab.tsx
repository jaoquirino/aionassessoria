import { useState } from "react";
import { Plus, Trash2, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAvailableRoles, useCreateRole, useDeleteRole, type AvailableRole } from "@/hooks/useAvailableRoles";

export function RolesManagementTab() {
  const [newRoleName, setNewRoleName] = useState("");
  const [deletingRole, setDeletingRole] = useState<AvailableRole | null>(null);

  const { data: roles = [], isLoading } = useAvailableRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const handleAdd = async () => {
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync(newRoleName);
    setNewRoleName("");
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    await deleteRole.mutateAsync(deletingRole.id);
    setDeletingRole(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-foreground mb-1">Cargos / Funções</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie os cargos disponíveis para integrantes e módulos
        </p>
      </div>
      <Separator />

      {/* Add new role */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do novo cargo..."
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          onClick={handleAdd}
          disabled={!newRoleName.trim() || createRole.isPending}
          className="gap-2 shrink-0"
        >
          {createRole.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </Button>
      </div>

      {/* Roles list */}
      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center justify-between rounded-lg border p-3 group"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{role.name}</span>
            </div>
            <button
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              onClick={() => setDeletingRole(role)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Nenhum cargo cadastrado
          </p>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              O cargo "{deletingRole?.name}" será removido da lista de opções. Integrantes que já possuem este cargo não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
