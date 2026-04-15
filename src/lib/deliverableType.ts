export function normalizeDeliverableType(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export type DeliverableKind = "arte" | "carrossel" | "video" | "edicao" | "fotografar" | "selecao" | "generic";

export function getDeliverableTypeKind(value?: string | null): DeliverableKind {
  const normalized = normalizeDeliverableType(value);

  if (normalized === "arte") return "arte";
  if (normalized === "carrossel") return "carrossel";
  if (normalized === "video" || normalized === "vídeo") return "video";
  if (normalized === "edição" || normalized === "edicao" || normalized === "edição") return "edicao";
  if (normalized === "fotografar") return "fotografar";
  if (normalized === "seleção" || normalized === "selecao" || normalized === "seleção") return "selecao";

  return "generic";
}

export function getDeliverableTypeLabel(value?: string | null) {
  const normalized = normalizeDeliverableType(value);

  if (!normalized) return "";

  if (normalized === "arte") return "Arte";
  if (normalized === "carrossel") return "Carrossel";
  if (normalized === "video" || normalized === "vídeo") return "Vídeo";
  if (normalized === "edição" || normalized === "edicao") return "Edição";
  if (normalized === "fotografar") return "Fotografar";
  if (normalized === "seleção" || normalized === "selecao") return "Seleção";

  return value?.trim() || "";
}
