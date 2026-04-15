export function normalizeDeliverableType(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function getDeliverableTypeKind(value?: string | null) {
  const normalized = normalizeDeliverableType(value);

  if (normalized === "arte") return "arte" as const;
  if (normalized === "carrossel") return "carrossel" as const;
  if (normalized === "video" || normalized === "vídeo") return "video" as const;

  return "generic" as const;
}

export function getDeliverableTypeLabel(value?: string | null) {
  const normalized = normalizeDeliverableType(value);

  if (!normalized) return "";

  if (normalized === "arte") return "Arte";
  if (normalized === "carrossel") return "Carrossel";
  if (normalized === "video" || normalized === "vídeo") return "Vídeo";

  return value?.trim() || "";
}