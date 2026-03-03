

## Plano: Unificar tarefas na página de Tarefas (exceto onboarding)

### Problema
Tarefas do tipo `project` são filtradas e não aparecem na página de Tarefas, causando "desaparecimento" de tarefas. O usuário quer que apenas tarefas de onboarding fiquem separadas.

### Mudanças

**1. `src/pages/Tasks.tsx`** — Remover filtro de `project` na linha que exclui tarefas operacionais:
```typescript
// De:
let filtered = tasks.filter(task => task.type !== "project" && task.type !== "onboarding");
// Para:
let filtered = tasks.filter(task => task.type !== "onboarding");
```

**2. `src/hooks/useDashboard.ts`** — Incluir tarefas `project` nos cálculos do dashboard (remover exclusão de `project` nos filtros de peso/contagem, mantendo exclusão de `onboarding`).

**3. `src/hooks/useDeliveriesDashboard.ts`** — Mesmo ajuste: remover exclusão de `project`.

**4. `src/pages/Tasks.tsx`** — Adicionar `"project"` às opções de tipo no filtro:
```typescript
const typeOptions = [
  { value: "recurring", label: "Entrega recorrente" },
  { value: "planning", label: "Planejamento" },
  { value: "project", label: "Projeto" },
  { value: "extra", label: "Extra" },
];
```

Nenhuma mudança no banco de dados. Tarefas de onboarding continuam visíveis apenas no fluxo de onboarding.

