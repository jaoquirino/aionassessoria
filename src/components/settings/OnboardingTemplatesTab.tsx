import { useState } from "react";
import { Plus, Package, Trash2, Edit2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  useOnboardingTemplates, 
  useCreateOnboardingTemplate, 
  useUpdateOnboardingTemplate,
  useDeleteOnboardingTemplate,
  useCreateTemplateStep,
  useUpdateTemplateStep,
  useDeleteTemplateStep,
  useReorderTemplateSteps,
  type OnboardingTemplate,
  type OnboardingTemplateStep 
} from "@/hooks/useOnboardingTemplates";
import { useAllModules } from "@/hooks/useModules";

const ROLES = [
  { value: "Gestão de Tráfego", label: "Gestão de Tráfego" },
  { value: "Copywriter", label: "Copywriter" },
  { value: "Designer", label: "Designer" },
  { value: "Social Media", label: "Social Media" },
  { value: "Atendimento", label: "Atendimento" },
  { value: "Gerente de Projetos", label: "Gerente de Projetos" },
  { value: "Comercial", label: "Comercial" },
];

export function OnboardingTemplatesTab() {
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  
  // Form states
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  
  const [editingStep, setEditingStep] = useState<OnboardingTemplateStep | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepRole, setStepRole] = useState("");

  const { data: templates, isLoading } = useOnboardingTemplates();
  const { data: modules } = useAllModules();
  const createTemplate = useCreateOnboardingTemplate();
  const updateTemplate = useUpdateOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();
  const createStep = useCreateTemplateStep();
  const updateStep = useUpdateTemplateStep();
  const deleteStep = useDeleteTemplateStep();
  const reorderSteps = useReorderTemplateSteps();

  // Modules that don't have a template yet
  const availableModules = modules?.filter(m => 
    m.is_active && !templates?.some(t => t.module_id === m.id)
  ) || [];

  const toggleTemplate = (id: string) => {
    setOpenTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateTemplate = () => {
    if (!selectedModuleId || !templateName.trim()) return;
    
    createTemplate.mutate({
      module_id: selectedModuleId,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
    }, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setSelectedModuleId("");
        setTemplateName("");
        setTemplateDescription("");
      },
    });
  };

  const handleToggleActive = (template: OnboardingTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  const handleOpenStepDialog = (templateId: string, step?: OnboardingTemplateStep) => {
    setCurrentTemplateId(templateId);
    if (step) {
      setEditingStep(step);
      setStepTitle(step.title);
      setStepDescription(step.description || "");
      setStepRole(step.responsible_role);
    } else {
      setEditingStep(null);
      setStepTitle("");
      setStepDescription("");
      setStepRole("");
    }
    setStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!currentTemplateId || !stepTitle.trim() || !stepRole) return;

    if (editingStep) {
      updateStep.mutate({
        id: editingStep.id,
        title: stepTitle.trim(),
        description: stepDescription.trim() || undefined,
        responsible_role: stepRole,
      }, {
        onSuccess: () => {
          setStepDialogOpen(false);
        },
      });
    } else {
      const template = templates?.find(t => t.id === currentTemplateId);
      const maxOrder = Math.max(0, ...(template?.steps?.map(s => s.order_index) || [0]));
      
      createStep.mutate({
        template_id: currentTemplateId,
        title: stepTitle.trim(),
        description: stepDescription.trim() || undefined,
        responsible_role: stepRole,
        order_index: maxOrder + 1,
      }, {
        onSuccess: () => {
          setStepDialogOpen(false);
        },
      });
    }
  };

  const handleMoveStep = (template: OnboardingTemplate, stepId: string, direction: "up" | "down") => {
    if (!template.steps) return;
    
    const stepIndex = template.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    
    const newSteps = [...template.steps];
    const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    // Swap order indices
    const updates = [
      { id: newSteps[stepIndex].id, order_index: newSteps[targetIndex].order_index },
      { id: newSteps[targetIndex].id, order_index: newSteps[stepIndex].order_index },
    ];
    
    reorderSteps.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Modelos de Onboarding</h3>
            <p className="text-sm text-muted-foreground">
              Configure os fluxos de ativação para cada módulo de serviço
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" disabled={availableModules.length === 0}>
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Button>
        </div>
        <Separator className="mb-4" />

        {/* Templates List */}
        <div className="space-y-4">
          {templates?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum modelo de onboarding</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie modelos de onboarding para automatizar a ativação de clientes por módulo
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Modelo
                </Button>
              </CardContent>
            </Card>
          )}

          {templates?.map((template) => (
            <Card key={template.id} className="border-border">
              <Collapsible open={openTemplates.has(template.id)} onOpenChange={() => toggleTemplate(template.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                      {openTemplates.has(template.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {template.service_module?.name} · {template.steps?.length || 0} etapas
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-3">
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Switch 
                        checked={template.is_active} 
                        onCheckedChange={() => handleToggleActive(template)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTemplateId(template.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Etapas do Onboarding</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStepDialog(template.id)}
                          className="gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar Etapa
                        </Button>
                      </div>

                      {template.steps?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma etapa configurada. Adicione etapas ao modelo.
                        </p>
                      )}

                      {template.steps?.map((step, index) => (
                        <div 
                          key={step.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleMoveStep(template, step.id, "up")}
                              disabled={index === 0}
                            >
                              <ChevronDown className="h-3 w-3 rotate-180" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleMoveStep(template, step.id, "down")}
                              disabled={index === (template.steps?.length || 0) - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.responsible_role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenStepDialog(template.id, step)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteStepId(step.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Modelo de Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Módulo de Serviço</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map(module => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableModules.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Todos os módulos já possuem modelo de onboarding
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nome do Modelo</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Onboarding Gestão de Tráfego"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Descreva o objetivo deste onboarding..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTemplate} 
              disabled={!selectedModuleId || !templateName.trim() || createTemplate.isPending}
            >
              {createTemplate.isPending ? "Criando..." : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Etapa</Label>
              <Input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="Ex: Coleta de acessos"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={stepDescription}
                onChange={(e) => setStepDescription(e.target.value)}
                placeholder="Descreva o que deve ser feito nesta etapa..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={stepRole} onValueChange={setStepRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveStep} 
              disabled={!stepTitle.trim() || !stepRole || createStep.isPending || updateStep.isPending}
            >
              {(createStep.isPending || updateStep.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirm */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo de onboarding? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTemplateId) {
                  deleteTemplate.mutate(deleteTemplateId);
                  setDeleteTemplateId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Step Confirm */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etapa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteStepId) {
                  deleteStep.mutate(deleteStepId);
                  setDeleteStepId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
