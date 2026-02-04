import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  Key,
  FileText,
  Layers,
  Calendar,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  client_id: string;
  step_name: string;
  step_order: number;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
  notes: string | null;
}

interface Client {
  id: string;
  name: string;
  status: string;
}

const stepIcons: Record<string, React.ReactNode> = {
  "Coleta de acessos": <Key className="h-5 w-5" />,
  "Briefing inicial": <FileText className="h-5 w-5" />,
  "Definição de módulos": <Layers className="h-5 w-5" />,
  "Reunião de kickoff": <Calendar className="h-5 w-5" />,
};

const stepDescriptions: Record<string, string> = {
  "Coleta de acessos": "Colete todos os acessos necessários: redes sociais, gerenciador de anúncios, Google Analytics, domínios, etc.",
  "Briefing inicial": "Realize o questionário completo sobre o negócio, público-alvo, objetivos e expectativas do cliente.",
  "Definição de módulos": "Defina quais módulos de serviço serão contratados e configure os detalhes do contrato.",
  "Reunião de kickoff": "Agende e realize a reunião inicial de kickoff com o cliente para alinhar expectativas e próximos passos.",
};

export default function ClientOnboarding() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientAndSteps();
    }
  }, [clientId]);

  const fetchClientAndSteps = async () => {
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        toast.error("Cliente não encontrado");
        navigate("/clientes");
        return;
      }

      setClient(clientData);

      // Fetch onboarding steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("client_id", clientId)
        .order("step_order", { ascending: true });

      if (stepsError) throw stepsError;

      setSteps(stepsData || []);

      // Find first incomplete step
      const firstIncomplete = stepsData?.findIndex(
        (s) => s.status !== "completed"
      );
      setActiveStep(firstIncomplete !== -1 ? firstIncomplete : 0);

      // Load notes for current step
      if (stepsData && stepsData[firstIncomplete !== -1 ? firstIncomplete : 0]) {
        setNotes(stepsData[firstIncomplete !== -1 ? firstIncomplete : 0].notes || "");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching data:", error);
      }
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setNotes(steps[index]?.notes || "");
  };

  const saveNotes = async () => {
    if (!steps[activeStep]) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("client_onboarding")
        .update({ notes })
        .eq("id", steps[activeStep].id);

      if (error) throw error;

      setSteps((prev) =>
        prev.map((s, i) => (i === activeStep ? { ...s, notes } : s))
      );
      toast.success("Notas salvas");
    } catch (error: any) {
      toast.error("Erro ao salvar notas");
    } finally {
      setIsSaving(false);
    }
  };

  const completeStep = async () => {
    if (!steps[activeStep]) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("client_onboarding")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", steps[activeStep].id);

      if (error) throw error;

      const updatedSteps = steps.map((s, i) =>
        i === activeStep
          ? { ...s, status: "completed" as const, completed_at: new Date().toISOString(), notes }
          : s
      );
      setSteps(updatedSteps);

      // Check if all steps are completed
      const allCompleted = updatedSteps.every((s) => s.status === "completed");

      if (allCompleted) {
        // Activate client
        await supabase
          .from("clients")
          .update({ status: "active" })
          .eq("id", clientId);

        toast.success("Onboarding finalizado! Cliente ativado.");
        navigate("/clientes");
      } else {
        // Move to next step
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        setNotes(steps[nextStep]?.notes || "");
        toast.success("Etapa concluída!");
      }
    } catch (error: any) {
      toast.error("Erro ao concluir etapa");
    } finally {
      setIsSaving(false);
    }
  };

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clientes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Onboarding: {client?.name}
            </h1>
            <p className="text-muted-foreground">
              {completedCount} de {steps.length} etapas concluídas
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/30">
          {Math.round(progress)}% completo
        </Badge>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-4"
      >
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Steps Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="font-semibold text-foreground mb-4">Etapas</h2>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all",
                  activeStep === index
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50",
                  step.status === "completed" && "opacity-70"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    step.status === "completed"
                      ? "bg-success/20 text-success"
                      : activeStep === index
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    stepIcons[step.step_name] || <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      step.status === "completed"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {step.step_name}
                  </p>
                  {step.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Concluído em{" "}
                      {new Date(step.completed_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <AnimatePresence mode="wait">
            {steps[activeStep] && (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    {stepIcons[steps[activeStep].step_name] || (
                      <Circle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {steps[activeStep].step_name}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {stepDescriptions[steps[activeStep].step_name]}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="notes">Anotações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adicione anotações sobre esta etapa..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={saveNotes}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Notas
                  </Button>

                  {steps[activeStep].status !== "completed" && (
                    <Button
                      onClick={completeStep}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {activeStep === steps.length - 1 ? (
                        <>
                          Finalizar Onboarding
                          <CheckCircle2 className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Concluir Etapa
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}

                  {steps[activeStep].status === "completed" && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Etapa Concluída
                    </Badge>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
