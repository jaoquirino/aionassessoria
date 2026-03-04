import { useState, useMemo } from "react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { CalendarItem } from "@/components/calendar/CalendarDayCell";
import { CalendarViewSelector, CalendarView } from "@/components/calendar/CalendarViewSelector";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { EditorialPostDialog } from "@/components/calendar/EditorialPostDialog";
import { DayDetailDialog } from "@/components/calendar/DayDetailDialog";
import { useEditorialPosts, EditorialPost } from "@/hooks/useEditorialPosts";
import { useTasks } from "@/hooks/useTasks";
import { useAllClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTasks";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newPostDate, setNewPostDate] = useState<Date | undefined>();

  const { data: editorialPosts = [] } = useEditorialPosts(currentDate);
  const { data: tasks = [] } = useTasks();
  const { data: clientsData = [] } = useAllClients();
  const { data: teamMembersData = [] } = useTeamMembers();

  const clients = clientsData.map((c) => ({ id: c.id, name: c.name, color: (c as any).color || null, logo_url: (c as any).logo_url || null }));
  const teamMembers = (teamMembersData || []).map((m: any) => ({ id: m.id, name: m.name }));

  // Build calendar items
  const { itemsByDate } = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};

    const addItem = (dateStr: string, item: CalendarItem) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    };

    // Tasks (exclude onboarding)
    if (typeFilter !== "editorial") {
      tasks
        .filter((t) => t.type !== "onboarding" && !t.archived_at)
        .filter((t) => clientFilter === "all" || t.client_id === clientFilter)
        .filter((t) => assigneeFilter === "all" || t.assigned_to === assigneeFilter)
        .forEach((t) => {
          addItem(t.due_date, {
            id: t.id,
            title: t.title,
            type: "task",
            status: t.status,
            clientName: (t as any).client?.name,
          });
        });
    }

    // Editorial posts
    if (typeFilter !== "tasks") {
      editorialPosts
        .filter((p) => clientFilter === "all" || p.client_id === clientFilter)
        .filter((p) => assigneeFilter === "all" || p.assigned_to === assigneeFilter)
        .forEach((p) => {
          addItem(p.scheduled_date, {
            id: p.id,
            title: p.title,
            type: "editorial",
            status: p.status,
            socialNetwork: p.social_network,
            clientName: p.client?.name || undefined,
          });
        });
    }

    return { itemsByDate: map };
  }, [tasks, editorialPosts, clientFilter, assigneeFilter, typeFilter]);

  const handlePrev = () => {
    switch (view) {
      case "day": setCurrentDate((d) => subDays(d, 1)); break;
      case "week": setCurrentDate((d) => subWeeks(d, 1)); break;
      case "month": setCurrentDate((d) => subMonths(d, 1)); break;
      case "year": setCurrentDate((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1)); break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case "day": setCurrentDate((d) => addDays(d, 1)); break;
      case "week": setCurrentDate((d) => addWeeks(d, 1)); break;
      case "month": setCurrentDate((d) => addMonths(d, 1)); break;
      case "year": setCurrentDate((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1)); break;
    }
  };

  const getTitle = () => {
    switch (view) {
      case "day": return format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
      case "week": {
        const start = startOfWeek(currentDate, { locale: ptBR });
        const end = endOfWeek(currentDate, { locale: ptBR });
        return `${format(start, "dd MMM", { locale: ptBR })} – ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
      }
      case "month": return format(currentDate, "MMMM yyyy", { locale: ptBR });
      case "year": return String(currentDate.getFullYear());
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDaySheetOpen(true);
  };

  const handleEditPost = (id: string) => {
    const post = editorialPosts.find((p) => p.id === id);
    if (post) {
      setEditingPost(post);
      setPostDialogOpen(true);
      setDaySheetOpen(false);
    }
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setNewPostDate(undefined);
    setPostDialogOpen(true);
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleMonthClickFromYear = (date: Date) => {
    setCurrentDate(date);
    setView("month");
  };

  const selectedDayItems = selectedDate
    ? itemsByDate[selectedDate.toISOString().split("T")[0]] || []
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Calendário</h1>
      </div>

      <CalendarFilters
        clientFilter={clientFilter}
        onClientFilterChange={setClientFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        clients={clients}
        teamMembers={teamMembers}
        onNewPost={handleNewPost}
      />

      {/* Navigation + View Selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize ml-2">
            {getTitle()}
          </h2>
        </div>
        <CalendarViewSelector view={view} onViewChange={setView} />
      </div>

      {/* Calendar Views */}
      {view === "month" && (
        <CalendarMonthView
          currentMonth={currentDate}
          itemsByDate={itemsByDate}
          onDayClick={handleDayClick}
          clients={clients}
        />
      )}
      {view === "week" && (
        <CalendarWeekView
          currentDate={currentDate}
          itemsByDate={itemsByDate}
          onDayClick={handleDayClick}
          clients={clients}
        />
      )}
      {view === "day" && (
        <CalendarDayView
          currentDate={currentDate}
          itemsByDate={itemsByDate}
          clients={clients}
          onItemClick={(item) => {
            if (item.type === "editorial") handleEditPost(item.id);
          }}
        />
      )}
      {view === "year" && (
        <CalendarYearView
          currentYear={currentDate.getFullYear()}
          itemsByDate={itemsByDate}
          onMonthClick={handleMonthClickFromYear}
        />
      )}

      <DayDetailSheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        date={selectedDate}
        items={selectedDayItems}
        onEditPost={handleEditPost}
      />

      <EditorialPostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        post={editingPost}
        clients={clients}
        teamMembers={teamMembers}
        defaultDate={newPostDate}
      />
    </div>
  );
}
