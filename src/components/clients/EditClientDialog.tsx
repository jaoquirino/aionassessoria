import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Calendar, Trash2, Pencil, ClipboardList, Eye, Play, Upload, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUpdateClient, useDeleteClient, type ClientStatus, type ClientWithContracts } from "@/hooks/useClients";
import { useClientContractsWithModules, useDeleteContract, type ContractWithModules } from "@/hooks/useContracts";
import { ContractDialog } from "./ContractDialog";
import { EditContractDialog } from "./EditContractDialog";
import { ClientContactInfo } from "./ClientContactInfo";

import { OnboardingStepsDialog } from "./OnboardingStepsDialog";
import { useClientOnboardingProgress } from "@/hooks/useClientModuleOnboarding";
import { format, differenceInDays } from "date-fns";
import { cn, parseLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
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
  const [clientColor, setClientColor] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [selectedOnboardingModule, setSelectedOnboardingModule] = useState<{
    contractModuleId: string;
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
      setStartDate(client.created_at.split("T")[0]);
      setCnpj(client.cnpj || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setClientColor((client as any).color || "");
      setClientLogoUrl((client as any).logo_url || "");
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
        created_at: parseLocalDate(startDate).toISOString(),
        cnpj: cnpj || undefined,
        phone: phone || undefined,
        email: email || undefined,
        color: clientColor || null,
        logo_url: clientLogoUrl || null,
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
      setStartDate(client.created_at.split("T")[0]);
      setCnpj(client.cnpj || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setClientColor((client as any).color || "");
      setClientLogoUrl((client as any).logo_url || "");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !client) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `logos/${client.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setClientLogoUrl(urlData.publicUrl);
      toast.success("Logo enviada");
    } catch {
      toast.error("Erro ao enviar logo");
    }
    setUploadingLogo(false);
    e.target.value = "";
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
    const renewalDate = contract.renewal_date ? parseLocalDate(contract.renewal_date) : null;
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
                <DatePicker
                  id="start-date"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecionar data"
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

          {/* Color & Logo */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor do cliente</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={clientColor || "#ffc000"}
                    onChange={(e) => setClientColor(e.target.value)}
                    className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={clientColor}
                    onChange={(e) => setClientColor(e.target.value)}
                    placeholder="#ffc000"
                    className="flex-1"
                  />
                  {clientColor && (
                    <Button variant="ghost" size="sm" onClick={() => setClientColor("")}>
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {clientLogoUrl ? (
                    <div className="relative group">
                      <img src={clientLogoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
                      <button
                        onClick={() => setClientLogoUrl("")}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <Upload className="h-4 w-4" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? "Enviando..." : "Enviar logo"}
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
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
                    ? differenceInDays(parseLocalDate(contract.renewal_date), new Date())
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
                              Início: {parseLocalDate(contract.start_date).toLocaleDateString("pt-BR")}
                            </span>
                            {contract.renewal_date && (
                              <span className="flex items-center gap-1">
                                Renova: {parseLocalDate(contract.renewal_date).toLocaleDateString("pt-BR")}
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
          {client && onboardingProgress && onboardingProgress.totalModules > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Progresso do Onboarding
                </h3>
                {onboardingProgress.progressPercent === 100 && (
                  <Badge className="bg-success/20 text-success border-success/30">
                    Concluído
                  </Badge>
                )}
              </div>
              
              {/* Module Cards with Actions */}
              <div className="space-y-2">
                {onboardingProgress.modules.map((module) => {
                  const isCompleted = module.status === "completed";
                  
                  return (
                    <div 
                      key={module.moduleId}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        isCompleted 
                          ? "bg-success/5 border-success/20 hover:bg-success/10" 
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                      onClick={() => handleOpenOnboarding({
                        contractModuleId: module.contractModuleId,
                        moduleName: module.moduleName,
                        isCompleted,
                      })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{module.moduleName}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                isCompleted 
                                  ? "bg-success/20 text-success border-success/30" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isCompleted ? "Concluído" : `${module.progressPercent}%`}
                            </Badge>
                          </div>
                          {!isCompleted && module.totalTasks > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {module.completedTasks}/{module.totalTasks} etapas
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={isCompleted ? "outline" : "default"}
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOnboarding({
                              contractModuleId: module.contractModuleId,
                              moduleName: module.moduleName,
                              isCompleted,
                            });
                          }}
                        >
                          {isCompleted ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Continuar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* Onboarding Steps Dialog */}
      {client && selectedOnboardingModule && (
        <OnboardingStepsDialog
          open={onboardingDialogOpen}
          onOpenChange={setOnboardingDialogOpen}
          clientId={client.id}
          contractModuleId={selectedOnboardingModule.contractModuleId}
          moduleName={selectedOnboardingModule.moduleName}
          isCompleted={selectedOnboardingModule.isCompleted}
        />
      )}
    </>
  );
}
