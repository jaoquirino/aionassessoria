import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDeliverableTypeKind, getDeliverableTypeLabel } from "@/lib/deliverableType";
import { GalleryHorizontal, Image as ImageIcon, Package, Video } from "lucide-react";

interface DeliverableTypeBadgeProps {
  value?: string | null;
  className?: string;
}

export function DeliverableTypeBadge({ value, className }: DeliverableTypeBadgeProps) {
  const label = getDeliverableTypeLabel(value);

  if (!label) return null;

  const kind = getDeliverableTypeKind(value);

  const Icon =
    kind === "arte"
      ? ImageIcon
      : kind === "carrossel"
        ? GalleryHorizontal
        : kind === "video"
          ? Video
          : Package;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs shrink-0",
        kind === "arte"
          ? "border-primary/30 text-primary"
          : kind === "carrossel"
            ? "border-warning/30 text-warning"
            : kind === "video"
              ? "border-info/30 text-info"
              : "border-border text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}