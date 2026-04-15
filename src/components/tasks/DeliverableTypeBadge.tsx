import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDeliverableTypeKind, getDeliverableTypeLabel } from "@/lib/deliverableType";
import { Camera, GalleryHorizontal, Image as ImageIcon, Package, Scissors, SlidersHorizontal, Video } from "lucide-react";

interface DeliverableTypeBadgeProps {
  value?: string | null;
  className?: string;
  iconOnly?: boolean;
}

const kindConfig = {
  arte: { Icon: ImageIcon, classes: "border-primary/30 text-primary" },
  carrossel: { Icon: GalleryHorizontal, classes: "border-warning/30 text-warning" },
  video: { Icon: Video, classes: "border-info/30 text-info" },
  edicao: { Icon: SlidersHorizontal, classes: "border-purple-400/30 text-purple-400" },
  fotografar: { Icon: Camera, classes: "border-emerald-400/30 text-emerald-400" },
  selecao: { Icon: Scissors, classes: "border-amber-400/30 text-amber-400" },
  generic: { Icon: Package, classes: "border-border text-muted-foreground" },
} as const;

export function DeliverableTypeBadge({ value, className, iconOnly }: DeliverableTypeBadgeProps) {
  const label = getDeliverableTypeLabel(value);

  if (!label) return null;

  const kind = getDeliverableTypeKind(value);
  const { Icon, classes } = kindConfig[kind];

  if (iconOnly) {
    return <Icon className={cn("h-3.5 w-3.5", classes.split(" ").filter(c => c.startsWith("text-")).join(" "), className)} />;
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-xs shrink-0", classes, className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
