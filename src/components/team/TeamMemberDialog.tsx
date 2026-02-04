import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTeamMember, useUpdateTeamMember, type TeamMember } from "@/hooks/useTeamMembers";

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
];

export function TeamMemberDialog({ member, open, onOpenChange }: TeamMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Designer");
  const [permission, setPermission] = useState("operational");
  const [capacityLimit, setCapacityLimit] = useState(15);

  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();

  const isEditing = !!member;

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email || "");
      setRole(member.role);
      setPermission(member.permission);
      setCapacityLimit(member.capacity_limit);
    } else {
      setName("");
      setEmail("");
      setRole("Designer");
      setPermission("operational");
      setCapacityLimit(15);
    }
  }, [member, open]);

  const handleSave = async () => {
    if (!name.trim() || !role) return;

    try {
      if (isEditing && member) {
        await updateMember.mutateAsync({
          id: member.id,
          name: name.trim(),
          email: email.trim() || null,
          role,
          permission,
          capacity_limit: capacityLimit,
        });
      } else {
        await createMember.mutateAsync({
          name: name.trim(),
          email: email.trim() || undefined,
          role,
          permission,
          capacity_limit: capacityLimit,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = createMember.isPending || updateMember.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Label htmlFor="role">Função *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
