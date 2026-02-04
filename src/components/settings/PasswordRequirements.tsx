import { Check, X } from "lucide-react";
import { getPasswordRequirements } from "@/lib/passwordValidation";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  show?: boolean;
}

export function PasswordRequirements({ password, show = true }: PasswordRequirementsProps) {
  if (!show) return null;
  
  const requirements = getPasswordRequirements(password);

  return (
    <div className="space-y-1.5 mt-2">
      <p className="text-xs text-muted-foreground font-medium">Requisitos da senha:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              req.met ? "text-green-600 dark:text-green-500" : "text-destructive"
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
