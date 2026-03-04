import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { CalendarItem } from "@/components/calendar/CalendarDayCell";
import { EditorialPostDialog } from "@/components/calendar/EditorialPostDialog";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";
import { useEditorialPosts, EditorialPost } from "@/hooks/useEditorialPosts";
import { useTasks } from "@/hooks/useTasks";
import { useAllClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTasks";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newPostDate, setNewPostDate] = useState<Date | undefined>();

  const { data: editorialPosts = [] } = useEditorialPosts(currentMonth);
  const { data: tasks = [] } = useTasks();
  const { data: clientsData = [] } = useAllClients();
  const { data: teamMembersData = [] } = useTeamMembers();

  const clients = clientsData.map(c => ({ id: c.id, name: c.name }));
  const teamMembers = (teamMembersData || []).map((m: any) => ({ id: m.id, name: m.name }));

  // Build calendar items
  const { itemsByDate, allItems } = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};

    const addItem = (dateStr: string, item: CalendarItem) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    };

    // Tasks (exclude onboarding)
    if (typeFilter !== "editorial") {
      tasks
        .filter(t => t.type !== "onboarding" && !t.archived_at)
        .filter(t => clientFilter === "all" || t.client_id === clientFilter)
        .filter(t => assigneeFilter === "all" || t.assigned_to === assigneeFilter)
        .forEach(t => {
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
        .filter(p => clientFilter === "all" || p.client_id === clientFilter)
        .filter(p => assigneeFilter === "all" || p.assigned_to === assigneeFilter)
        .forEach(p => {
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

    const all = Object.values(map).flat();
    return { itemsByDate: map, allItems: all };
  }, [tasks, editorialPosts, clientFilter, assigneeFilter, typeFilter]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDaySheetOpen(true);
  };

  const handleEditPost = (id: string) => {
    const post = editorialPosts.find(p => p.id === id);
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

  const selectedDayItems = selectedDate
    ? itemsByDate[selectedDate.toISOString().split("T")[0]] || []
    : [];

  return (
    <div className="space-y-6">
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

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <CalendarGrid
        currentMonth={currentMonth}
        items={allItems}
        itemsByDate={itemsByDate}
        onDayClick={handleDayClick}
      />

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
