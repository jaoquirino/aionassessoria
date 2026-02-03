import { motion } from "framer-motion";
import { Save, User, Bell, Shield, Palette, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize o sistema para sua agência
        </p>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="general" className="gap-2">
              <User className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="capacity" className="gap-2">
              <Database className="h-4 w-4" />
              Capacidade
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Informações da Agência</h3>
                <p className="text-sm text-muted-foreground">
                  Dados básicos da sua agência
                </p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Nome da Agência</Label>
                  <Input id="agencyName" defaultValue="Minha Agência" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contato</Label>
                  <Input id="email" type="email" defaultValue="contato@agencia.com" />
                </div>
              </div>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Alertas de Contrato</h3>
                <p className="text-sm text-muted-foreground">
                  Configure quando receber alertas de renovação
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">30 dias antes da renovação</p>
                    <p className="text-sm text-muted-foreground">Receber alerta antecipado</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Último mês de contrato</p>
                    <p className="text-sm text-muted-foreground">Alerta quando entrar no último mês</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Tarefas atrasadas</p>
                    <p className="text-sm text-muted-foreground">Notificar quando uma tarefa atrasar</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Preferências
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Limites de Capacidade</h3>
                <p className="text-sm text-muted-foreground">
                  Configure os limites padrão de peso por funcionário
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultWeight">Peso máximo padrão por funcionário</Label>
                  <Input id="defaultWeight" type="number" defaultValue="15" className="max-w-[200px]" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Alerta de capacidade em 80%</p>
                    <p className="text-sm text-muted-foreground">Mostrar status de atenção</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Bloquear atribuição acima do limite</p>
                    <p className="text-sm text-muted-foreground">Impedir atribuição quando capacidade excedida</p>
                  </div>
                  <Switch />
                </div>
              </div>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>

            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Pesos de Tipos de Tarefa</h3>
                <p className="text-sm text-muted-foreground">
                  Configure o peso padrão para cada tipo de tarefa
                </p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recurringWeight">Entrega Recorrente</Label>
                  <Input id="recurringWeight" type="number" defaultValue="2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planningWeight">Planejamento</Label>
                  <Input id="planningWeight" type="number" defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectWeight">Projeto</Label>
                  <Input id="projectWeight" type="number" defaultValue="4" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraWeight">Extra</Label>
                  <Input id="extraWeight" type="number" defaultValue="3" />
                </div>
              </div>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Pesos
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Tema</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha entre modo claro e escuro
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Modo Escuro</p>
                  <p className="text-sm text-muted-foreground">Usar tema escuro como padrão</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
