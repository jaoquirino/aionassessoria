import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show green/red validation border */
  validationState?: "valid" | "invalid" | "verifying" | null;
  className?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••••••",
  validationState = null,
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "pr-16",
          validationState === "valid" && "border-green-500 focus-visible:ring-green-500",
          validationState === "invalid" && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {validationState === "verifying" && (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {validationState === "valid" && (
          <Check className="h-4 w-4 text-green-500" />
        )}
        {validationState === "invalid" && (
          <X className="h-4 w-4 text-destructive" />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}
