import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Calendar, Trash2, Pencil, ClipboardList, Eye, Play } from "lucide-react";
import { useUpdateClient, useDeleteClient, type ClientStatus, type ClientWithContracts } from "@/hooks/useClients";
import { useClientContractsWithModules, useDeleteContract, type ContractWithModules } from "@/hooks/useContracts";
import { ContractDialog } from "./ContractDialog";
import { EditContractDialog } from "./EditContractDialog";
import { ClientContactInfo } from "./ClientContactInfo";
import { ClientOnboardingProgress } from "@/components/onboarding/ClientOnboardingProgress";
import { OnboardingStepsDialog } from "./OnboardingStepsDialog";
import { useClientOnboardingProgress } from "@/hooks/useClientModuleOnboarding";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
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

interface EditClientDialogProps {
  client: ClientWithContracts | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated?: () => void;
  openContractDialogOnMount?: boolean;
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "onboarding", label: "Em Onboarding" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "ended", label: "Encerrado" },
];

const statusConfig = {
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  expiring_soon: { label: "Próx. vencimento", color: "bg-warning/20 text-warning border-warning/30" },
  renewing: { label: "Em renovação", color: "bg-primary/20 text-primary border-primary/30" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted" },
};

export function EditClientDialog({ 
  client, 
  open, 
  onOpenChange, 
  onClientUpdated,
  openContractDialogOnMount = false 
}: EditClientDialogProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithModules | null>(null);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [selectedOnboardingModule, setSelectedOnboardingModule] = useState<{
    contractModuleId: string;
    templateId: string;
    moduleName: string;
    isCompleted: boolean;
  } | null>(null);

  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const deleteContract = useDeleteContract();
  const { data: contracts = [] } = useClientContractsWithModules(client?.id || null);
  const { data: onboardingProgress } = useClientOnboardingProgress(client?.id || "");

  // Sync form state when client changes
  useEffect(() => {
    if (client) {
      setName(client.name);
      setStatus(client.status);
      setStartDate(format(new Date(client.created_at), "yyyy-MM-dd"));
      setCnpj(client.cnpj || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
    }
  }, [client]);

  // Reset contract dialog state when main dialog closes
  useEffect(() => {
    if (!open) {
      setContractDialogOpen(false);
      setEditingContract(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!client) return;

    try {
      await updateClient.mutateAsync({ 
        id: client.id,
        name: name.trim(),
        status,
        created_at: new Date(startDate).toISOString(),
        cnpj: cnpj || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });
      onClientUpdated?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    try {
      await deleteClient.mutateAsync(client.id);
      onOpenChange(false);
      onClientUpdated?.();
    } catch (error) {
      // Error handled by mutation
    }
    setDeleteClientOpen(false);
  };

  const handleDeleteContract = async () => {
    if (deletingContractId) {
      await deleteContract.mutateAsync(deletingContractId);
      setDeletingContractId(null);
    }
  };

  const handleCancel = () => {
    if (client) {
      setName(client.name);
      setStatus(client.status);
      setStartDate(format(new Date(client.created_at), "yyyy-MM-dd"));
      setCnpj(client.cnpj || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
    }
  };

  const handleOpenOnboarding = (module: typeof selectedOnboardingModule) => {
    setSelectedOnboardingModule(module);
    setOnboardingDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getContractStatus = (contract: typeof contracts[0]) => {
    if (contract.status === "ended") return "ended";
    const renewalDate = contract.renewal_date ? new Date(contract.renewal_date) : null;
    const daysUntilRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : 999;
    if (daysUntilRenewal <= 7) return "renewing";
    if (daysUntilRenewal <= 30) return "expiring_soon";
    return "active";
  };

  if (!client) return null;

  const isSaving = updateClient.isPending;

  return (
    <>
      <EditDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Editar Cliente"
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        autoSaveOnOutsideClick={true}
      >
        <div className="space-y-6">
          {/* Basic Info */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                  <SelectTrigger id="client-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Cliente desde</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Informações de Contato</h3>
            <ClientContactInfo
              cnpj={cnpj}
              phone={phone}
              email={email}
              onCnpjChange={setCnpj}
              onPhoneChange={setPhone}
              onEmailChange={setEmail}
            />
          </div>

          <Separator />

          {/* Contracts Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contratos
              </h3>
              <Button size="sm" variant="outline" onClick={() => setContractDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" />
                Novo Contrato
              </Button>
            </div>

            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum contrato cadastrado
              </p>
            ) : (
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {contracts.map((contract) => {
                  const contractStatus = getContractStatus(contract);
                  const daysUntilRenewal = contract.renewal_date 
                    ? differenceInDays(new Date(contract.renewal_date), new Date())
                    : null;

                  return (
                    <div
                      key={contract.id}
                      className={cn(
                        "p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer",
                        contractStatus === "expiring_soon" && "border-warning/30",
                        contractStatus === "renewing" && "border-primary/30"
                      )}
                      onClick={() => setEditingContract(contract)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-foreground text-sm sm:text-base">
                              {formatCurrency(contract.monthly_value)}/mês
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", statusConfig[contractStatus].color)}
                            >
                              {statusConfig[contractStatus].label}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Início: {format(new Date(contract.start_date), "dd/MM/yyyy")}
                            </span>
                            {contract.renewal_date && (
                              <span className="flex items-center gap-1">
                                Renova: {format(new Date(contract.renewal_date), "dd/MM/yyyy")}
                                {daysUntilRenewal !== null && daysUntilRenewal > 0 && daysUntilRenewal <= 30 && (
                                  <span className={cn(
                                    "font-medium",
                                    daysUntilRenewal <= 7 ? "text-destructive" : "text-warning"
                                  )}>
                                    ({daysUntilRenewal}d)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          {contract.modules && contract.modules.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {contract.modules.map((cm) => (
                                <Badge key={cm.id} variant="secondary" className="text-xs">
                                  {cm.service_module.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 self-end sm:self-start">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContract(contract);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingContractId(contract.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Onboarding Progress Section */}
          {client && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Progresso do Onboarding
              </h3>
              <ClientOnboardingProgress clientId={client.id} showDetail={true} />
            </div>
          )}

          <Separator />

          {/* Delete Client */}
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => setDeleteClientOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Cliente
          </Button>
        </div>
      </EditDialog>

      {/* New Contract Dialog */}
      {client && (
        <ContractDialog
          clientId={client.id}
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
        />
      )}

      {/* Edit Contract Dialog */}
      <EditContractDialog
        contract={editingContract}
        open={!!editingContract}
        onOpenChange={(open) => !open && setEditingContract(null)}
      />

      {/* Delete Client Confirmation */}
      <AlertDialog open={deleteClientOpen} onOpenChange={setDeleteClientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente "{client?.name}" e todos os seus contratos e tarefas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contract Confirmation */}
      <AlertDialog open={!!deletingContractId} onOpenChange={() => setDeletingContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente este contrato e seus módulos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContract} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
