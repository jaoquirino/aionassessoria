import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Phone, Mail } from "lucide-react";

interface ClientContactInfoProps {
  cnpj: string;
  phone: string;
  email: string;
  onCnpjChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}

// Format CNPJ as user types: XX.XXX.XXX/XXXX-XX
function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Format phone as user types: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function ClientContactInfo({
  cnpj,
  phone,
  email,
  onCnpjChange,
  onPhoneChange,
  onEmailChange,
}: ClientContactInfoProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client-cnpj" className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          CNPJ
        </Label>
        <Input
          id="client-cnpj"
          value={cnpj}
          onChange={(e) => onCnpjChange(formatCNPJ(e.target.value))}
          placeholder="00.000.000/0000-00"
          maxLength={18}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client-phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Telefone
          </Label>
          <Input
            id="client-phone"
            value={phone}
            onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="contato@empresa.com"
          />
        </div>
      </div>
    </div>
  );
}
