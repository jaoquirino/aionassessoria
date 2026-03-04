

## Plano: Ajustar exibição da logo do cliente

O problema é que as logos estão com `rounded` / `rounded-lg` + `object-cover` em tamanhos pequenos (w-4 h-4, w-8 h-8), o que corta a imagem. A solução é usar `object-contain` e remover o arredondamento excessivo, mantendo a logo legível.

### Alterações

**3 arquivos** — trocar `object-cover` por `object-contain` e remover `rounded`/`rounded-lg` das imagens de logo:

1. **`src/components/tasks/TaskKanbanBoard.tsx`** (linha ~386)
   - `w-4 h-4 rounded object-cover` → `w-4 h-4 object-contain`

2. **`src/components/tasks/TaskListView.tsx`** (linha ~118)
   - `w-4 h-4 rounded object-cover` → `w-4 h-4 object-contain`

3. **`src/pages/Clients.tsx`** (linha ~363)
   - `w-8 h-8 rounded-lg object-cover border` → `w-8 h-8 object-contain`

Também remover os fallbacks de cor (div colorida) já que o usuário disse "pode deixar a logo do cliente e pronto" — manter apenas a logo quando existir, e nada quando não existir.

