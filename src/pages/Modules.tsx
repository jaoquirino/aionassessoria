import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceModule {
  id: string;
  name: string;
  description: string;
  operationalWeight: number;
  monthlyRecurrence: boolean;
  mainRole: string;
  activeClients: number;
}

const mockModules: ServiceModule[] = [
  {
    id: "1",
    name: "Gestão de Tráfego",
    description: "Gerenciamento de campanhas pagas em Google, Meta e TikTok",
    operationalWeight: 4,
    monthlyRecurrence: true,
    mainRole: "Gestor de Tráfego",
    activeClients: 18,
  },
  {
    id: "2",
    name: "Copywriting",
    description: "Criação de textos para redes sociais, anúncios e blog",
    operationalWeight: 2,
    monthlyRecurrence: true,
    mainRole: "Copywriter",
    activeClients: 12,
  },
  {
    id: "3",
    name: "Design (Artes e Vídeos)",
    description: "Criação de artes estáticas, reels e material visual",
    operationalWeight: 3,
    monthlyRecurrence: true,
    mainRole: "Designer",
    activeClients: 20,
  },
  {
    id: "4",
    name: "Estruturação Comercial",
    description: "Consultoria e implementação de processos comerciais",
    operationalWeight: 5,
    monthlyRecurrence: false,
    mainRole: "Comercial",
    activeClients: 5,
  },
  {
    id: "5",
    name: "Landing Pages / Sites",
    description: "Desenvolvimento de páginas de vendas e sites institucionais",
    operationalWeight: 4,
    monthlyRecurrence: false,
    mainRole: "Designer",
    activeClients: 8,
  },
  {
    id: "6",
    name: "Cardápio Digital",
    description: "Criação e manutenção de cardápios digitais",
    operationalWeight: 2,
    monthlyRecurrence: true,
    mainRole: "Designer",
    activeClients: 6,
  },
  {
    id: "7",
    name: "Identidade Visual",
    description: "Desenvolvimento completo de identidade visual e branding",
    operationalWeight: 5,
    monthlyRecurrence: false,
    mainRole: "Designer",
    activeClients: 3,
  },
];

export default function Modules() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Módulos de Serviço</h1>
          <p className="text-muted-foreground">
            Configure os serviços oferecidos pela agência
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Módulo
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar módulos..." className="pl-9" />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total de Módulos</p>
          <p className="text-2xl font-bold text-foreground">{mockModules.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Recorrentes</p>
          <p className="text-2xl font-bold text-foreground">
            {mockModules.filter((m) => m.monthlyRecurrence).length}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Peso Médio</p>
          <p className="text-2xl font-bold text-foreground">
            {(mockModules.reduce((acc, m) => acc + m.operationalWeight, 0) / mockModules.length).toFixed(1)}
          </p>
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mockModules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="glass rounded-xl p-5 group transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground">{module.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {module.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary">
                Peso: {module.operationalWeight}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  module.monthlyRecurrence
                    ? "border-success/30 text-success"
                    : "border-muted text-muted-foreground"
                )}
              >
                {module.monthlyRecurrence ? "Recorrente" : "Pontual"}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Função principal:</span>
                <span className="font-medium text-foreground">{module.mainRole}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clientes ativos:</span>
                <span className="font-medium text-foreground">{module.activeClients}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
