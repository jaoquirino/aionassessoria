import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Save, Loader2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useOnboardingTemplateSteps } from "@/hooks/useOnboardingTemplates";
import { useClientOnboardingResponses, useUpsertOnboardingResponse } from "@/hooks/useOnboardingResponses";
import { cn } from "@/lib/utils";

interface OnboardingStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contractModuleId: string;
  templateId: string;
  moduleName: string;
  isCompleted?: boolean;
  readOnly?: boolean;
}

interface LocalResponse {
  stepId: string;
  value: string;
  isCompleted: boolean;
}

export function OnboardingStepsDialog({
  open,
  onOpenChange,
  clientId,
  contractModuleId,
  templateId,
  moduleName,
  isCompleted = false,
  readOnly = false,
}: OnboardingStepsDialogProps) {
  const [localResponses, setLocalResponses] = useState<Map<string, LocalResponse>>(new Map());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: steps = [], isLoading: stepsLoading } = useOnboardingTemplateSteps(templateId);
  const { data: existingResponses = [], isLoading: responsesLoading } = useClientOnboardingResponses(clientId, contractModuleId);
  const upsertResponse = useUpsertOnboardingResponse();

  // Initialize local state from existing responses
  useEffect(() => {
    if (steps.length > 0 && !responsesLoading) {
      const map = new Map<string, LocalResponse>();
      
      steps.forEach((step) => {
        const existing = existingResponses.find(r => r.template_step_id === step.id);
        map.set(step.id, {
          stepId: step.id,
          value: existing?.response_value || "",
          isCompleted: existing?.is_completed || false,
        });
      });
      
      setLocalResponses(map);
      setHasChanges(false);
      
      // Auto-expand first incomplete step if not in read-only mode
      if (!readOnly) {
        const firstIncomplete = steps.find(s => {
          const response = map.get(s.id);
          return !response?.isCompleted;
        });
        if (firstIncomplete) {
          setExpandedSteps(new Set([firstIncomplete.id]));
        }
      }
    }
  }, [steps, existingResponses, responsesLoading, readOnly]);

  const handleResponseChange = (stepId: string, value: string) => {
    setLocalResponses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(stepId) || { stepId, value: "", isCompleted: false };
      newMap.set(stepId, { ...current, value });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleCompletedChange = (stepId: string, isCompleted: boolean) => {
    setLocalResponses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(stepId) || { stepId, value: "", isCompleted: false };
      newMap.set(stepId, { ...current, isCompleted });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const promises = Array.from(localResponses.values()).map(response => 
      upsertResponse.mutateAsync({
        client_id: clientId,
        contract_module_id: contractModuleId,
        template_step_id: response.stepId,
        response_value: response.value,
        is_completed: response.isCompleted,
      })
    );

    await Promise.all(promises);
    setHasChanges(false);
    onOpenChange(false);
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const completedCount = Array.from(localResponses.values()).filter(r => r.isCompleted).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const isLoading = stepsLoading || responsesLoading;
  const isSaving = upsertResponse.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? <Eye className="h-5 w-5" /> : null}
            {moduleName} - Onboarding
            {isCompleted && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                Concluído
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedCount}/{steps.length} etapas</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-4">
              <AnimatePresence>
                {steps.map((step, index) => {
                  const response = localResponses.get(step.id);
                  const isExpanded = expandedSteps.has(step.id);
                  const stepIsCompleted = response?.isCompleted || false;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Collapsible open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
                        <div
                          className={cn(
                            "border rounded-lg transition-colors",
                            stepIsCompleted ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"
                          )}
                        >
                          <CollapsibleTrigger className="w-full p-4 flex items-start gap-3 text-left">
                            <div className={cn(
                              "mt-0.5 flex-shrink-0",
                              stepIsCompleted ? "text-green-500" : "text-muted-foreground"
                            )}>
                              {stepIsCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Etapa {index + 1}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {step.responsible_role}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-foreground mt-1">{step.title}</h4>
                              {step.description && !isExpanded && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {step.description}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-4">
                              {step.description && (
                                <p className="text-sm text-muted-foreground pl-8">
                                  {step.description}
                                </p>
                              )}

                              <div className="pl-8 space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`response-${step.id}`}>
                                    Resposta / Informações
                                    {step.response_required && (
                                      <span className="text-destructive ml-1">*</span>
                                    )}
                                  </Label>
                                  <Textarea
                                    id={`response-${step.id}`}
                                    value={response?.value || ""}
                                    onChange={(e) => handleResponseChange(step.id, e.target.value)}
                                    placeholder="Digite as informações coletadas nesta etapa..."
                                    rows={3}
                                    disabled={readOnly}
                                    className={cn(readOnly && "opacity-70")}
                                  />
                                </div>

                                {!readOnly && (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`completed-${step.id}`}
                                      checked={stepIsCompleted}
                                      onCheckedChange={(checked) => 
                                        handleCompletedChange(step.id, checked as boolean)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`completed-${step.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      Marcar como concluída
                                    </Label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
