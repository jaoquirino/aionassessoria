import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarItem } from "./CalendarDayCell";

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  clients?: { id: string; name: string; color: string | null; logo_url: string | null }[];
}

const statusLabels: Record<string, string> = {
  planned: "Planejado",
  approved: "Aprovado",
  published: "Publicado",
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisão",
  waiting_client: "Aguardando cliente",
  done: "Concluída",
};

export function DayDetailDialog({ open, onOpenChange, date, items, onItemClick, clients = [] }: DayDetailDialogProps) {
  if (!date) return null;

  const clientColorMap: Record<string, string> = {};
  const clientLogoMap: Record<string, string> = {};
  clients.forEach((c) => {
    if (c.color) clientColorMap[c.name] = c.color;
    if (c.logo_url) clientLogoMap[c.name] = c.logo_url;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum item neste dia.</p>
          )}
          {items.map((item) => {
            const clientColor = item.clientName ? clientColorMap[item.clientName] : null;
            const clientLogo = item.clientName ? clientLogoMap[item.clientName] : null;
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                style={clientColor ? { borderLeftColor: clientColor, borderLeftWidth: 3 } : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  {clientLogo && (
                    <img src={clientLogo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  )}
                  <Badge variant={item.type === "task" ? "default" : "secondary"} className="text-[10px]">
                    {item.type === "task" ? "Tarefa" : "Editorial"}
                  </Badge>
                  {item.socialNetwork && (
                    <span className="text-[10px] text-muted-foreground capitalize">{item.socialNetwork}</span>
                  )}
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                {item.clientName && <p className="text-xs text-muted-foreground">{item.clientName}</p>}
                {item.status && (
                  <span className="text-[10px] text-muted-foreground">{statusLabels[item.status] || item.status}</span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
