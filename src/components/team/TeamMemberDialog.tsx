import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Link2, Unlink } from "lucide-react";
import { useCreateTeamMember, useUpdateTeamMember, type TeamMember } from "@/hooks/useTeamMembers";
import { useLinkToTeamMember, useUnlinkTeamMember, useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

interface TeamMemberDialogProps {
  member?: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions = [
  "Designer",
  "Gestor de Tráfego",
  "Copywriter",
  "Comercial",
  "Atendimento",
  "Desenvolvedor",
  "Social Media",
  "Estrategista",
  "Diretor de Arte",
  "Produtor de Conteúdo",
];

export function TeamMemberDialog({ member, open, onOpenChange }: TeamMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["Designer"]);
  const [permission, setPermission] = useState("operational");
  const [capacityLimit, setCapacityLimit] = useState(15);

  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const linkToMember = useLinkToTeamMember();
  const unlinkMember = useUnlinkTeamMember();

  const isEditing = !!member;
  const isLinkedToCurrentUser = member && (member as any).user_id === user?.id;
  const canLinkAccount = isEditing && !isLinkedToCurrentUser && !currentTeamMember;

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email || "");
      // Parse multiple roles from comma-separated string
      const memberRoles = member.role?.split(",").map(r => r.trim()).filter(Boolean) || ["Designer"];
      setRoles(memberRoles);
      setPermission(member.permission);
      setCapacityLimit(member.capacity_limit);
    } else {
      setName("");
      setEmail("");
      setRoles(["Designer"]);
      setPermission("operational");
      setCapacityLimit(15);
    }
  }, [member, open]);

  const handleAddRole = (role: string) => {
    if (!roles.includes(role)) {
      setRoles([...roles, role]);
    }
  };

  const handleRemoveRole = (role: string) => {
    if (roles.length > 1) {
      setRoles(roles.filter(r => r !== role));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || roles.length === 0) return;

    // Store roles as comma-separated string
    const roleString = roles.join(", ");

    try {
      if (isEditing && member) {
        await updateMember.mutateAsync({
          id: member.id,
          name: name.trim(),
          email: email.trim() || null,
          role: roleString,
          permission,
          capacity_limit: capacityLimit,
        });
      } else {
        await createMember.mutateAsync({
          name: name.trim(),
          email: email.trim() || undefined,
          role: roleString,
          permission,
          capacity_limit: capacityLimit,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleLinkAccount = async () => {
    if (!member) return;
    await linkToMember.mutateAsync(member.id);
  };

  const handleUnlinkAccount = async () => {
    if (!member) return;
    await unlinkMember.mutateAsync(member.id);
  };

  const isSaving = createMember.isPending || updateMember.isPending;
  const availableRoles = roleOptions.filter(r => !roles.includes(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Link Account Section */}
          {isEditing && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Vincular à sua conta</p>
                  <p className="text-xs text-muted-foreground">
                    {isLinkedToCurrentUser 
                      ? "Este membro está vinculado à sua conta"
                      : canLinkAccount 
                        ? "Vincule para ser atribuído como responsável em tarefas"
                        : currentTeamMember
                          ? "Sua conta já está vinculada a outro membro"
                          : "Membro já vinculado a outra conta"
                    }
                  </p>
                </div>
                {isLinkedToCurrentUser ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUnlinkAccount}
                    disabled={unlinkMember.isPending}
                    className="gap-1"
                  >
                    <Unlink className="h-3 w-3" />
                    Desvincular
                  </Button>
                ) : canLinkAccount && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleLinkAccount}
                    disabled={linkToMember.isPending}
                    className="gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    Vincular
                  </Button>
                )}
              </div>
              {isLinkedToCurrentUser && (
                <Badge variant="secondary" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  Minha conta
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do membro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@agencia.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Cargos / Funções *</Label>
            <p className="text-xs text-muted-foreground">Um membro pode ter múltiplos cargos</p>
            
            {/* Selected Roles */}
            <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-md bg-muted/30">
              {roles.map((role) => (
                <Badge 
                  key={role} 
                  variant="secondary" 
                  className="gap-1 pr-1"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className={cn(
                      "rounded-full p-0.5 hover:bg-destructive/20",
                      roles.length === 1 && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={roles.length === 1}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Add Role */}
            {availableRoles.length > 0 && (
              <Select value="" onValueChange={handleAddRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar cargo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission">Nível de Acesso</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Limite de Capacidade</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={50}
              value={capacityLimit}
              onChange={(e) => setCapacityLimit(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || roles.length === 0}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
