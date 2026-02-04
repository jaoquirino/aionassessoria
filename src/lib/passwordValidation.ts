import { z } from "zod";

// Strong password validation schema
export const strongPasswordSchema = z.string()
  .min(12, "Senha deve ter no mínimo 12 caracteres")
  .regex(/[a-z]/, "Senha deve conter letra minúscula")
  .regex(/[A-Z]/, "Senha deve conter letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter número")
  .regex(/[^a-zA-Z0-9]/, "Senha deve conter caractere especial");

// Get password requirements with status for UI display
export const getPasswordRequirements = (password: string) => [
  { label: "Mínimo 12 caracteres", met: password.length >= 12 },
  { label: "Letra minúscula (a-z)", met: /[a-z]/.test(password) },
  { label: "Letra maiúscula (A-Z)", met: /[A-Z]/.test(password) },
  { label: "Número (0-9)", met: /[0-9]/.test(password) },
  { label: "Caractere especial (!@#$...)", met: /[^a-zA-Z0-9]/.test(password) },
];

// Check if password meets all requirements
export const isPasswordStrong = (password: string): boolean => {
  return strongPasswordSchema.safeParse(password).success;
};
