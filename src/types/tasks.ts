// Task types matching database schema

export type TaskType = "recurring" | "planning" | "project" | "extra" | "onboarding";
export type TaskStatusDB = "todo" | "in_progress" | "review" | "waiting_client" | "done";

export interface TeamMember {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  permission: string;
  avatar_url: string | null;
  capacity_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Public view of team members (without sensitive fields)
export interface TeamMemberPublic {
  id: string | null;
  name: string | null;
  role: string | null;
  permission: string | null;
  avatar_url: string | null;
  capacity_limit: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Client {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  monthly_value: number;
  start_date: string;
  minimum_duration_months: number;
  renewal_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface ServiceModule {
  id: string;
  name: string;
  description: string | null;
  default_weight: number;
  is_recurring: boolean;
  primary_role: string;
  deliverable_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractModule {
  id: string;
  contract_id: string;
  module_id: string;
  custom_weight: number | null;
  deliverable_limit: number | null;
  deliverable_used: number;
  last_reset_date: string;
  created_at: string;
  contract?: Contract;
  service_module?: ServiceModule;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  client_id: string;
  contract_id: string | null;
  contract_module_id: string | null;
  type: TaskType;
  required_role: string;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string;
  status: TaskStatusDB;
  weight: number;
  priority: TaskPriority;
  description_objective: string | null;
  description_deliverable: string | null;
  description_references: string | null;
  description_notes: string | null;
  is_deliverable: boolean;
  deliverable_type: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: Client;
  contract?: Contract;
  contract_module?: ContractModule & { service_module?: ServiceModule };
  assignee?: TeamMember;
  creator?: TeamMember;
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
  history?: TaskHistory[];
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  item_text: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  order_index: number;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  performed_by: string | null;
  created_at: string;
  performer?: TeamMember;
}

export interface CreateTaskInput {
  title: string;
  client_id: string;
  contract_id?: string | null;
  contract_module_id?: string | null;
  type: TaskType;
  required_role: string;
  assigned_to?: string | null;
  created_by?: string | null;
  due_date: string;
  status?: TaskStatusDB;
  priority?: TaskPriority;
  description_objective?: string | null;
  description_deliverable?: string | null;
  description_references?: string | null;
  description_notes?: string | null;
  is_deliverable?: boolean;
  checklist?: string[];
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  client_id?: string;
  contract_id?: string | null;
  contract_module_id?: string | null;
  type?: TaskType;
  required_role?: string;
  assigned_to?: string | null;
  due_date?: string;
  status?: TaskStatusDB;
  priority?: TaskPriority;
  weight?: number;
  description_objective?: string | null;
  description_deliverable?: string | null;
  description_references?: string | null;
  description_notes?: string | null;
  is_deliverable?: boolean;
  deliverable_type?: string | null;
}

// Status config for UI - incluindo "overdue" virtual
export type TaskStatusDisplay = TaskStatusDB | "overdue";

export const taskStatusConfig: Record<TaskStatusDisplay, { label: string; color: string }> = {
  overdue: { label: "Pra ontem", color: "bg-destructive/20 text-destructive" },
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Em revisão", color: "bg-warning/20 text-warning" },
  waiting_client: { label: "Aguardando cliente", color: "bg-info/20 text-info" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

export const taskTypeConfig: Record<TaskType, { label: string; color: string; weight: number }> = {
  recurring: { label: "Entrega recorrente", color: "border-info/30 text-info", weight: 2 },
  planning: { label: "Planejamento", color: "border-purple/30 text-purple", weight: 1 },
  project: { label: "Projeto", color: "border-primary/30 text-primary", weight: 4 },
  extra: { label: "Extra", color: "border-orange/30 text-orange", weight: 3 },
  onboarding: { label: "Onboarding", color: "border-emerald-500/30 text-emerald-600", weight: 4 },
};

export const priorityConfig: Record<TaskPriority, { label: string; color: string; order: number }> = {
  low: { label: "Baixa", color: "bg-success/20 text-success", order: 4 },
  medium: { label: "Média", color: "bg-warning/20 text-warning", order: 3 },
  high: { label: "Alta", color: "bg-primary/20 text-primary", order: 2 },
  urgent: { label: "Pra ontem", color: "bg-destructive/20 text-destructive", order: 1 },
};

// roleOptions moved to useAvailableRoles hook (dynamic from database)
