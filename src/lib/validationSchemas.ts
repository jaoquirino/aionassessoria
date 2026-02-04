import { z } from "zod";

// UUID validation helper
const uuidSchema = z.string().uuid("ID inválido");

// Client schemas
export const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo").trim(),
  status: z.enum(["onboarding", "active", "paused", "ended"]).optional(),
});

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo").trim(),
  client_id: uuidSchema,
  contract_id: uuidSchema.nullable().optional(),
  contract_module_id: uuidSchema.nullable().optional(),
  type: z.enum(["recurring", "planning", "project", "extra"]),
  required_role: z.string().min(1, "Função é obrigatória").max(100),
  assigned_to: uuidSchema.nullable().optional(),
  due_date: z.string().min(1, "Data de entrega é obrigatória"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  description_objective: z.string().max(5000).nullable().optional(),
  description_deliverable: z.string().max(5000).nullable().optional(),
  description_references: z.string().max(5000).nullable().optional(),
  description_notes: z.string().max(5000).nullable().optional(),
  is_deliverable: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(200).trim().optional(),
  contract_id: uuidSchema.nullable().optional(),
  contract_module_id: uuidSchema.nullable().optional(),
  type: z.enum(["recurring", "planning", "project", "extra"]).optional(),
  required_role: z.string().min(1).max(100).optional(),
  assigned_to: uuidSchema.nullable().optional(),
  due_date: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "waiting_client", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  description_objective: z.string().max(5000).nullable().optional(),
  description_deliverable: z.string().max(5000).nullable().optional(),
  description_references: z.string().max(5000).nullable().optional(),
  description_notes: z.string().max(5000).nullable().optional(),
  is_deliverable: z.boolean().optional(),
});

// Comment schemas
export const commentSchema = z.object({
  taskId: uuidSchema,
  content: z.string().min(1, "Comentário não pode estar vazio").max(5000, "Comentário muito longo").trim(),
});

export const updateCommentSchema = z.object({
  commentId: uuidSchema,
  content: z.string().min(1, "Comentário não pode estar vazio").max(5000, "Comentário muito longo").trim(),
  taskId: uuidSchema,
});

// User role schema
export const userRoleSchema = z.object({
  userId: uuidSchema,
  role: z.enum(["admin", "member"]),
});

// Contract schemas
export const contractSchema = z.object({
  client_id: uuidSchema,
  monthly_value: z.number().positive("Valor deve ser positivo"),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  minimum_duration_months: z.number().int().positive().optional(),
  renewal_date: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

// Generic safe error message mapper
export const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Dados inválidos";
  }
  
  const err = error as { code?: string; message?: string };
  
  // Map common Postgres error codes to safe messages
  switch (err.code) {
    case "23505":
      return "Registro duplicado";
    case "23503":
      return "Referência inválida";
    case "23502":
      return "Campo obrigatório não preenchido";
    case "22P02":
      return "Formato de dados inválido";
    case "42501":
      return "Sem permissão para esta ação";
    default:
      return "Erro ao processar solicitação";
  }
};

// Safe console logger (only logs in development)
export const devLog = {
  error: (message: string, error?: unknown) => {
    if (import.meta.env.DEV) {
      console.error(message, error);
    }
  },
  warn: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(message, data);
    }
  },
  log: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.log(message, data);
    }
  },
};
