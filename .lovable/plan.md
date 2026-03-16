

## Plano: Adicionar "Carrossel" como tipo de entregável de Design

### Objetivo
Adicionar `carrossel` como terceiro tipo de entregável de design (ao lado de `arte` e `video`), para que seja contabilizado nos dashboards, filtros e seletores.

### Arquivos a editar

**1. `src/components/tasks/TaskEditDialog.tsx`** (~linha 787-790 e 815-818)
- Adicionar `<SelectItem value="carrossel">🎠 Carrossel</SelectItem>` nos dois seletores de deliverable_type

**2. `src/components/tasks/SubtaskRow.tsx`** (~linha 117-123)
- Adicionar opção "carrossel" no Select e atualizar o display ternário para incluir `carrossel`

**3. `src/components/tasks/TaskKanbanBoard.tsx`** (~linha 410-418)
- Adicionar tratamento para `carrossel` no badge (icone `GalleryHorizontal` ou similar, cor distinta)

**4. `src/hooks/useDashboard.ts`** (~linha 258-275)
- Incluir `deliverableType === "carrossel"` na condição `isDesignDeliverable`
- Adicionar `carrosselCount` ao tracking por cliente

**5. `src/components/dashboard/AdvancedDashboards.tsx`** (~linha 41, 138-139, 214-244, 320-323)
- Expandir `designFilter` type para incluir `"carrossel"`
- Contar `carrosselCount` nos filtros
- Adicionar botão de filtro para carrossel
- Atualizar badge de exibição para incluir carrossel

**6. `src/pages/Dashboard.tsx`** (~linha 696-699)
- Atualizar badge de deliverableType para tratar `carrossel`

### Detalhes
- Valor no banco: `"carrossel"` (string, sem migração necessaria pois `deliverable_type` e `text`)
- Emoji/icone: `📸 Carrossel` ou icone `GalleryHorizontal` do Lucide
- Cor: `border-orange/30 text-orange` (distinta de purple/arte e info/video)

