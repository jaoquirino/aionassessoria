import { useState } from "react";
import { Plus, Trash2, Loader2, Briefcase, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAvailableRoles, useCreateRole, useUpdateRole, useDeleteRole, type AvailableRole } from "@/hooks/useAvailableRoles";

export function RolesManagementTab() {
  const [newRoleName, setNewRoleName] = useState("");
  const [deletingRole, setDeletingRole] = useState<AvailableRole | null>(null);
  const [editingRole, setEditingRole] = useState<AvailableRole | null>(null);
  const [editName, setEditName] = useState("");

  const { data: roles = [], isLoading } = useAvailableRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
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

  const handleStartEdit = (role: AvailableRole) => {
    setEditingRole(role);
    setEditName(role.name);
  };

  const handleSaveEdit = async () => {
    if (!editingRole || !editName.trim()) return;
    await updateRole.mutateAsync({ id: editingRole.id, name: editName });
    setEditingRole(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditName("");
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
            {editingRole?.id === role.id ? (
              <div className="flex items-center gap-2 flex-1 mr-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  className="h-8"
                  autoFocus
                />
                <button
                  className="rounded-lg p-1.5 text-success hover:bg-success/10 transition-colors"
                  onClick={handleSaveEdit}
                  disabled={updateRole.isPending}
                >
                  {updateRole.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{role.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleStartEdit(role)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => setDeletingRole(role)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
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
