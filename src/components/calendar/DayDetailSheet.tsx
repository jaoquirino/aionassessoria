import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CalendarItem } from "./CalendarDayCell";

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  items: CalendarItem[];
  onEditPost: (id: string) => void;
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

export function DayDetailSheet({ open, onOpenChange, date, items, onEditPost }: DayDetailSheetProps) {
  if (!date) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>{format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item neste dia.</p>
          )}
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => item.type === "editorial" && onEditPost(item.id)}
              className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
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
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
