
# Plano: Melhorias de Funcionalidades em Tarefas

## Resumo das Melhorias

Este plano adiciona interatividade inline aos cards de tarefas, permitindo edição rápida sem abrir o modal completo, além de um botão geral para criar tarefas.

---

## Funcionalidades a Implementar

### 1. Botão Geral de Adicionar Tarefa
Adicionar um botão "Nova Tarefa" no header da página de Tarefas (ao lado do toggle Kanban/Lista) que abre um modal de criação completo.

### 2. Edição Inline nos Cards (Kanban e Lista)
Cada elemento clicável no card abrirá um popover/dropdown para edição rápida:

| Campo | Ação |
|-------|------|
| **Responsável** | Click abre dropdown com lista de membros da equipe (múltipla seleção para futuro) |
| **Data** | Click abre calendário picker inline |
| **Função (required_role)** | Click abre dropdown com opções: Designer, Gestor de Tráfego, Copywriter, Comercial, Desenvolvedor |

### 3. Remoção do Badge "Média" (Prioridade)
O badge exibindo "Média", "Alta", etc. será possível alterar a prioridade da tarefa.

---

## Detalhes Técnicos

### Arquivos a Modificar

**`src/pages/Tasks.tsx`**
- Adicionar botão "Nova Tarefa" no header
- Criar função `handleAddGeneralTask()` para criar tarefa via modal

**`src/components/tasks/TaskKanbanBoard.tsx`**
- Modificar `TaskCard` para aceitar callbacks de edição inline
- Adicionar popovers para cada campo editável
- Passar props: `onAssigneeChange`, `onDueDateChange`, `onRoleChange`, `teamMembers`, `roleOptions`

**`src/components/tasks/TaskListView.tsx`**
- Aplicar mesma lógica de edição inline
- Adicionar popovers para responsável, data e função

**`src/hooks/useTasks.ts`**
- Adicionar mutation `useUpdateTaskField` otimizada para atualizações parciais rápidas

### Componentes de UI Utilizados
- `Popover` + `PopoverContent` (já existe no projeto)
- `Calendar` para seleção de data
- `Select` ou `Command` para seleção de responsável/função
- `Checkbox` para seleção múltipla de responsáveis (preparação futura)

### Fluxo de Interação

```text
┌─────────────────────────────────────────────────────────────┐
│  Card da Tarefa                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Título da Tarefa]                                      │ │
│  │ Cliente: Empresa XYZ                                    │ │
│  │                                                         │ │
│  │ [Click: Função] ───────► Popover com Select             │ │
│  │   Designer ▼             ├── Designer                   │ │
│  │                          ├── Gestor de Tráfego          │ │
│  │                          ├── Copywriter                 │ │
│  │                          └── ...                        │ │
│  │                                                         │ │
│  │ [Click: Responsável] ──► Popover com lista de membros   │ │
│  │   👤 João Silva          ├── ☑ João Silva               │ │
│  │                          ├── ☐ Maria Santos             │ │
│  │                          └── ...                        │ │
│  │                                                         │ │
│  │ [Click: Data] ─────────► Popover com Calendário         │ │
│  │   📅 04/02                ┌──────────────┐              │ │
│  │                          │   Fev 2026   │              │ │
│  │                          │ [Calendário] │              │ │
│  │                          └──────────────┘              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Considerações

### Performance
- As atualizações usarão optimistic updates do React Query para feedback instantâneo
- Cache será atualizado localmente antes da resposta do servidor

### UX
- Click fora do popover fecha e salva automaticamente
- Indicador visual de "salvando" durante mutations
- Campos clicáveis terão hover sutil para indicar interatividade

### Banco de Dados
- Não são necessárias alterações no esquema
- A coluna `required_role` já existe e aceita strings
- O campo `assigned_to` já é uma FK para `team_members`

### Múltiplos Responsáveis (Preparação Futura)
- A UI será preparada para múltipla seleção com checkboxes
- Quando for implementado no backend, bastará adicionar uma tabela de junção `task_assignees`

---

## Ordem de Implementação

1. Adicionar botão geral "Nova Tarefa" no header
2. Criar componente `InlineEditPopover` reutilizável
3. Modificar `TaskCard` com edição inline (Kanban)
4. Modificar `TaskListView` com edição inline
5. Remover badge de prioridade dos cards
6. Testar fluxo completo
