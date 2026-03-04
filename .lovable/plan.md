

## Plano: Ocultar tarefas concluídas há +7 dias na aba Tarefas

Alterações **somente** em `src/pages/Tasks.tsx` e `src/components/tasks/CollapsibleFilters.tsx`. Nenhuma mudança no Dashboard, Entregáveis ou Equipe.

### Comportamento
- Tarefas `done` com `updated_at` anterior a 7 dias ficam ocultas por padrão
- Quando um filtro de período (dateFrom/dateTo) estiver ativo, todas as tarefas (incluindo concluídas antigas) dentro do range são exibidas
- Stats (Total Ativas, Atrasadas, etc.) continuam calculados sobre `operationalTasks` sem alteração

### Alterações

**1. `src/components/tasks/CollapsibleFilters.tsx`**
- Adicionar `dateFrom?: string` e `dateTo?: string` ao `FiltersState`
- Adicionar no popover de filtros uma seção "Período" com dois `DatePicker` (De / Até)
- Contar período ativo no badge de filtros
- `clearFilters` reseta também `dateFrom` e `dateTo`

**2. `src/pages/Tasks.tsx`**
- Atualizar estado inicial de `filters` com `dateFrom: undefined, dateTo: undefined`
- Na lógica de `filteredTasks`:
  - Se **nenhum filtro de período** ativo: excluir tarefas `done` cuja `updated_at < 7 dias atrás`
  - Se **período ativo**: filtrar todas as tarefas pela `due_date` dentro do range (incluindo concluídas antigas)
- Nenhuma alteração nos hooks (`useTasks`, `useDashboard`, `useDeliveriesDashboard`) nem em outras páginas

