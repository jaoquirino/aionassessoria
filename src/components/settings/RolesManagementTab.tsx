import { useState } from "react";
import { Plus, Trash2, Loader2, Briefcase, Pencil, Check, X } from "lucide-react";
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
import { useAvailableRoles, useCreateRole, useUpdateRole, useDeleteRole, type AvailableRole } from "@/hooks/useAvailableRoles";
import { useAllRoleDeliverables, useAddRoleDeliverable, useDeleteRoleDeliverable } from "@/hooks/useRoleDeliverables";

export function RolesManagementTab() {
  const [newRoleName, setNewRoleName] = useState("");
  const [deletingRole, setDeletingRole] = useState<AvailableRole | null>(null);
  const [editingRole, setEditingRole] = useState<AvailableRole | null>(null);
  const [editName, setEditName] = useState("");
  const [newDeliverableInputs, setNewDeliverableInputs] = useState<Record<string, string>>({});

  const { data: roles = [], isLoading } = useAvailableRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const { data: allDeliverables = [] } = useAllRoleDeliverables();
  const addDeliverable = useAddRoleDeliverable();
  const removeDeliverable = useDeleteRoleDeliverable();

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

  const handleAddDeliverable = async (roleId: string) => {
    const type = newDeliverableInputs[roleId]?.trim();
    if (!type) return;
    await addDeliverable.mutateAsync({ roleId, deliverableType: type });
    setNewDeliverableInputs((prev) => ({ ...prev, [roleId]: "" }));
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
          Gerencie os cargos e o que cada um entrega
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
      <div className="space-y-4">
        {roles.map((role) => {
          const deliverables = allDeliverables.filter((d) => d.role_id === role.id);
          return (
            <div key={role.id} className="rounded-lg border p-4 space-y-3">
              {/* Role header */}
              <div className="flex items-center justify-between">
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
                    <div className="flex items-center gap-1">
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

              {/* Deliverables for this role */}
              <div className="pl-6 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Tipos de entrega:</p>
                <div className="flex flex-wrap gap-1.5">
                  {deliverables.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Nenhum tipo definido</span>
                  )}
                  {deliverables.map((d) => (
                    <Badge key={d.id} variant="secondary" className="gap-1 pr-1">
                      {d.deliverable_type}
                      <button
                        type="button"
                        onClick={() => removeDeliverable.mutate(d.id)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Arte, Vídeo..."
                    value={newDeliverableInputs[role.id] || ""}
                    onChange={(e) =>
                      setNewDeliverableInputs((prev) => ({ ...prev, [role.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddDeliverable(role.id)}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddDeliverable(role.id)}
                    disabled={!newDeliverableInputs[role.id]?.trim() || addDeliverable.isPending}
                    className="h-8 gap-1 shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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
              O cargo "{deletingRole?.name}" e seus tipos de entrega serão removidos. Integrantes que já possuem este cargo não serão afetados.
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
