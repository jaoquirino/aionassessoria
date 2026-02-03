import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useClients, useClientContracts, useContractModules, useTeamMembers, useCreateTask } from "@/hooks/useTasks";
import { taskTypeConfig, roleOptions, type TaskType } from "@/types/tasks";

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  client_id: z.string().min(1, "Selecione um cliente"),
  contract_id: z.string().optional(),
  contract_module_id: z.string().optional(),
  type: z.enum(["recurring", "planning", "project", "extra"]),
  required_role: z.string().min(1, "Selecione a função exigida"),
  assigned_to: z.string().optional(),
  due_date: z.date({ required_error: "Selecione a data de entrega" }),
  description_objective: z.string().optional(),
  description_deliverable: z.string().optional(),
  description_references: z.string().optional(),
  description_notes: z.string().optional(),
  is_deliverable: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskDialog({ open, onOpenChange }: AddTaskDialogProps) {
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const { data: clients = [] } = useClients();
  const { data: teamMembers = [] } = useTeamMembers();
  const createTask = useCreateTask();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      client_id: "",
      contract_id: "",
      contract_module_id: "",
      type: "recurring",
      required_role: "",
      assigned_to: "",
      description_objective: "",
      description_deliverable: "",
      description_references: "",
      description_notes: "",
      is_deliverable: false,
    },
  });

  const selectedClientId = form.watch("client_id");
  const selectedContractId = form.watch("contract_id");
  const selectedType = form.watch("type");

  const { data: contracts = [] } = useClientContracts(selectedClientId || null);
  const { data: contractModules = [] } = useContractModules(selectedContractId || null);

  // Reset contract when client changes
  useEffect(() => {
    form.setValue("contract_id", "");
    form.setValue("contract_module_id", "");
  }, [selectedClientId, form]);

  // Reset module when contract changes
  useEffect(() => {
    form.setValue("contract_module_id", "");
  }, [selectedContractId, form]);

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem("");
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    await createTask.mutateAsync({
      title: values.title,
      client_id: values.client_id,
      type: values.type,
      required_role: values.required_role,
      due_date: format(values.due_date, "yyyy-MM-dd"),
      contract_id: values.contract_id || null,
      contract_module_id: values.contract_module_id || null,
      assigned_to: values.assigned_to || null,
      description_objective: values.description_objective || null,
      description_deliverable: values.description_deliverable || null,
      description_references: values.description_references || null,
      description_notes: values.description_notes || null,
      is_deliverable: values.is_deliverable,
      checklist: checklistItems,
    });

    form.reset();
    setChecklistItems([]);
    onOpenChange(false);
  };

  // Get selected module info for deliverable warning
  const selectedModule = contractModules.find(cm => cm.id === form.watch("contract_module_id"));
  const moduleHasLimit = selectedModule?.deliverable_limit != null;
  const deliverableUsed = selectedModule?.deliverable_used ?? 0;
  const deliverableLimit = selectedModule?.deliverable_limit ?? 0;
  const isNearLimit = moduleHasLimit && deliverableUsed >= deliverableLimit * 0.8;
  const isOverLimit = moduleHasLimit && deliverableUsed >= deliverableLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa com todos os detalhes necessários
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Tarefa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Criar campanha Black Friday" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contract_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contrato</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedClientId || contracts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={contracts.length === 0 ? "Nenhum contrato" : "Selecione"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contracts.map((contract) => (
                              <SelectItem key={contract.id} value={contract.id}>
                                R$ {contract.monthly_value}/mês
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contract_module_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Módulo de Serviço</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedContractId || contractModules.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={contractModules.length === 0 ? "Nenhum módulo" : "Selecione"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractModules.map((cm) => (
                              <SelectItem key={cm.id} value={cm.id}>
                                {cm.service_module?.name}
                                {cm.deliverable_limit && (
                                  <span className="ml-2 text-muted-foreground">
                                    ({cm.deliverable_used}/{cm.deliverable_limit})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Tarefa *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.entries(taskTypeConfig) as [TaskType, typeof taskTypeConfig[TaskType]][]).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <span>{config.label}</span>
                                  <Badge variant="outline" className="text-xs">P{config.weight}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Peso automático: {taskTypeConfig[selectedType as TaskType]?.weight ?? 2}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Deliverable toggle with warning */}
                {selectedModule && moduleHasLimit && (
                  <FormField
                    control={form.control}
                    name="is_deliverable"
                    render={({ field }) => (
                      <FormItem className={cn(
                        "flex flex-row items-center justify-between rounded-lg border p-4",
                        isOverLimit && "border-destructive/50 bg-destructive/5",
                        isNearLimit && !isOverLimit && "border-warning/50 bg-warning/5"
                      )}>
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Conta como entregável</FormLabel>
                          <FormDescription>
                            {selectedModule.service_module?.name}: {deliverableUsed}/{deliverableLimit} usados
                          </FormDescription>
                          {isOverLimit && (
                            <div className="flex items-center gap-1 text-destructive text-sm">
                              <AlertCircle className="h-4 w-4" />
                              Limite de entregáveis excedido!
                            </div>
                          )}
                          {isNearLimit && !isOverLimit && (
                            <div className="flex items-center gap-1 text-warning text-sm">
                              <AlertCircle className="h-4 w-4" />
                              Próximo do limite de entregáveis
                            </div>
                          )}
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Responsibility */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Responsabilidade</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="required_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função Exigida *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Atribuir depois" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <span>{member.name}</span>
                                  <span className="text-xs text-muted-foreground">({member.role})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Entrega *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Descrição Estruturada</h4>
                
                <FormField
                  control={form.control}
                  name="description_objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo da tarefa</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="O que queremos alcançar com esta tarefa?" 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_deliverable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O que deve ser entregue</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva os entregáveis esperados" 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_references"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referências e Links</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Links úteis, referências visuais, etc." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notas adicionais" 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Checklist */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Checklist Interno</h4>
                <p className="text-sm text-muted-foreground">
                  Adicione subetapas para rastrear o progresso da tarefa
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Nova subetapa..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddChecklistItem())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {checklistItems.length > 0 && (
                  <div className="space-y-2">
                    {checklistItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="flex-1 text-sm">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveChecklistItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? "Criando..." : "Criar Tarefa"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
