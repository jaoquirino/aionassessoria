import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditDialog } from "@/components/ui/edit-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ClientStatus = "onboarding" | "active" | "paused" | "ended";

interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  created_at: string;
}

interface EditClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated?: () => void;
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "onboarding", label: "Em Onboarding" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "ended", label: "Encerrado" },
];

export function EditClientDialog({ 
  client, 
  open, 
  onOpenChange, 
  onClientUpdated 
}: EditClientDialogProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when client changes
  useEffect(() => {
    if (client) {
      setName(client.name);
      setStatus(client.status);
    }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          name: name.trim(),
          status,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast.success("Cliente atualizado");
      onClientUpdated?.();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (client) {
      setName(client.name);
      setStatus(client.status);
    }
  };

  if (!client) return null;

  return (
    <EditDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Cliente"
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      autoSaveOnOutsideClick={true}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-name">Nome do Cliente</Label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do cliente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
            <SelectTrigger id="client-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Cliente desde: {new Date(client.created_at).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </EditDialog>
  );
}
