import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  currentWeight: number;
  maxWeight: number;
  tasksCount: number;
  overdueTasks: number;
}

const mockTeam: TeamMember[] = [
  {
    id: "1",
    name: "Ana Silva",
    role: "Designer",
    currentWeight: 14,
    maxWeight: 15,
    tasksCount: 5,
    overdueTasks: 1,
  },
  {
    id: "2",
    name: "Carlos Santos",
    role: "Gestor de Tráfego",
    currentWeight: 18,
    maxWeight: 15,
    tasksCount: 7,
    overdueTasks: 2,
  },
  {
    id: "3",
    name: "Maria Costa",
    role: "Copywriter",
    currentWeight: 8,
    maxWeight: 15,
    tasksCount: 4,
    overdueTasks: 0,
  },
  {
    id: "4",
    name: "João Mendes",
    role: "Designer",
    currentWeight: 12,
    maxWeight: 15,
    tasksCount: 4,
    overdueTasks: 1,
  },
];

function getCapacityStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  if (percentage > 100) return "critical";
  if (percentage >= 80) return "attention";
  return "normal";
}

function getStatusColor(status: string) {
  switch (status) {
    case "critical":
      return "bg-destructive";
    case "attention":
      return "bg-warning";
    default:
      return "bg-success";
  }
}

export function TeamCapacity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass rounded-xl p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Capacidade da Equipe
        </h3>
        <p className="text-sm text-muted-foreground">
          Distribuição de carga operacional
        </p>
      </div>

      <div className="space-y-5">
        {mockTeam.map((member, index) => {
          const status = getCapacityStatus(member.currentWeight, member.maxWeight);
          const percentage = Math.min(
            (member.currentWeight / member.maxWeight) * 100,
            100
          );

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn("status-indicator", `status-${status}`)}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {member.currentWeight}/{member.maxWeight}
                  </span>
                </div>
              </div>

              <div className="relative">
                <Progress
                  value={percentage}
                  className={cn(
                    "h-2",
                    status === "critical" && "[&>div]:bg-destructive",
                    status === "attention" && "[&>div]:bg-warning",
                    status === "normal" && "[&>div]:bg-success"
                  )}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{member.tasksCount} tarefas ativas</span>
                {member.overdueTasks > 0 && (
                  <span className="text-destructive">
                    {member.overdueTasks} atrasada{member.overdueTasks > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
