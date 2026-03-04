

## Plano: Página de Calendário com Tarefas e Calendário Editorial

### Escopo
Criar uma nova página "Calendário" no sistema com duas visualizações integradas: tarefas existentes por data e postagens do calendário editorial (novo). Inclui filtros por empresa, pessoa e tipo.

### 1. Banco de Dados — Nova tabela `editorial_posts`

```sql
CREATE TABLE public.editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned', -- planned, approved, published
  social_network text NOT NULL, -- instagram, facebook, tiktok, linkedin, etc.
  content_type text NOT NULL, -- post, story, reel, carousel, video
  title text NOT NULL,
  caption text,
  notes text,
  created_by uuid REFERENCES public.team_members(id),
  assigned_to uuid REFERENCES public.team_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;
-- RLS: team members can CRUD
```

Nova tabela `editorial_post_attachments` para imagens/vídeos (usando Storage bucket `editorial`).

```sql
CREATE TABLE public.editorial_post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('editorial', 'editorial', true);
```

### 2. Frontend — Nova página `/calendario`

**Rota e navegação:**
- Adicionar rota `/calendario` em `App.tsx`
- Adicionar item "Calendário" com ícone `CalendarDays` no Sidebar (visível para todos)

**Página `src/pages/Calendar.tsx`:**
- Visualização mensal em grid (7 colunas x semanas)
- Cada dia mostra cards coloridos: tarefas (azul) e postagens editoriais (roxo/verde por rede social)
- Navegação mês anterior/próximo
- Click no dia abre lista lateral ou modal com detalhes

**Filtros (topo da página):**
- Por empresa (cliente) — Select com todos os clientes
- Por pessoa (responsável) — Select com team members
- Por tipo — "Todos", "Tarefas", "Calendário Editorial"

**Dialog de criação/edição de postagem:**
- Campos: título, cliente, data, rede social, tipo de conteúdo, legenda/texto, notas, responsável, status
- Upload de imagem/vídeo (Storage bucket `editorial`)
- Botão de salvar/editar

### 3. Hooks

- `src/hooks/useEditorialPosts.ts` — CRUD para `editorial_posts` e `editorial_post_attachments`
- Reutilizar `useClients` e `useTeamMembers` existentes para filtros

### 4. Componentes

```text
src/pages/Calendar.tsx              — Página principal
src/components/calendar/
  CalendarGrid.tsx                  — Grid mensal
  CalendarDayCell.tsx               — Célula do dia com cards
  EditorialPostDialog.tsx           — Modal criar/editar postagem
  CalendarFilters.tsx               — Filtros (cliente, pessoa, tipo)
```

### 5. Navegação atualizada

```typescript
const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users, adminOnly: true },
  { name: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { name: "Calendário", href: "/calendario", icon: CalendarDays },
  { name: "Equipe", href: "/equipe", icon: UserCircle, adminOnly: true },
  { name: "Módulos", href: "/modulos", icon: Puzzle, adminOnly: true },
];
```

### Fora do escopo (próxima etapa)
- Visibilidade configurável por funcionário (módulos do sistema)
- Reorganização de "Módulos" (produto) para dentro de Configurações

