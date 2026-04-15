import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";
import { useModuleDeliverableTypes } from "@/hooks/useModuleDeliverableTypes";

interface ClientModule {
  contractModuleId: string;
  moduleId: string;
  moduleName: string;
  primaryRole: string;
  defaultWeight: number;
  isRecurring: boolean;
}

interface DeliverableTypeSelectorProps {
  contractModuleId: string | null;
  clientModules: ClientModule[];
  value: string | null;
  onChange: (value: string | null) => void;
  showIcon?: boolean;
  compact?: boolean;
}

export function DeliverableTypeSelector({
  contractModuleId,
  clientModules,
  value,
  onChange,
  showIcon = false,
  compact = false,
}: DeliverableTypeSelectorProps) {
  const selectedModule = clientModules.find(m => m.contractModuleId === contractModuleId);
  const moduleId = selectedModule?.moduleId;
  const { data: deliverableTypes = [] } = useModuleDeliverableTypes(moduleId);

  if (!contractModuleId || deliverableTypes.length === 0) return null;

  if (compact) {
    return (
      <Select
        value={value || ""}
        onValueChange={(val) => onChange(val || null)}
      >
        <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 w-auto border-dashed gap-0.5 inline-flex">
          <SelectValue placeholder="Tipo">
            {value ? deliverableTypes.find(dt => dt.name.toLowerCase() === value.toLowerCase())?.name || value : "Tipo"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {deliverableTypes.map((dt) => (
            <SelectItem key={dt.id} value={dt.name.toLowerCase()} className="text-xs">
              {dt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {showIcon && <Package className="h-3 w-3" />} Tipo de Entregável
      </Label>
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Nenhum" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          {deliverableTypes.map((dt) => (
            <SelectItem key={dt.id} value={dt.name.toLowerCase()}>
              {dt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
