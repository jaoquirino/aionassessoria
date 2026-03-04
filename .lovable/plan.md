
# Plano de Correções: Cards da Equipe, Aba de Cargos e Saúde dos Clientes

## Problema 1: Layout dos cards da Equipe
O card atual mostra todos os cargos diretamente, ficando visualmente poluído. O novo layout solicitado:
- **Linha 1**: Foto + Nome + (Admin/Operacional) + botoes editar/deletar no final
- **Cargos**: Nao mostrar no card, apenas ao abrir o funcionario
- **Barra de carga**: Sempre alinhada ao final do card

### Alteracao
- **src/pages/Team.tsx**: Reestruturar o card para usar `flex flex-col h-full` com a barra de capacidade em `mt-auto`, remover os badges de cargo do card, e colocar o badge Admin/Operacional ao lado do nome na primeira linha.

---

## Problema 2: Aba de Cargos nao aparece nas Configuracoes
A aba existe no codigo (linha 477-482 de Settings.tsx), mas com muitas abas na TabsList, ela pode estar sendo cortada visualmente em telas menores ou o scroll nao esta funcionando. 

### Alteracao
- **src/pages/Settings.tsx**: Garantir que a TabsList tenha `overflow-x-auto` e `flex-nowrap` para que todas as abas fiquem visiveis com scroll horizontal. Tambem reorganizar a ordem das abas para que "Cargos" fique mais acessivel.

---

## Problema 3: Tabela "Saude dos Clientes" sempre mostra "Critico"
O bug esta na logica de calculo do `healthStatus` em `src/hooks/useDashboard.ts` (linha 220):

```text
const ratio = revenue > 0 && stats.weight > 0 ? revenue / stats.weight : 1;
```

Quando o peso operacional e 0 (sem tarefas ativas), o ratio cai para 1, que e menor que 200 e portanto "critico". O correto e: se nao ha peso operacional, o cliente esta saudavel (sem carga = sem problema).

### Alteracao
- **src/hooks/useDashboard.ts**: Corrigir a logica para que `stats.weight === 0` resulte em status "normal" em vez de "critico":

```text
if (stats.weight === 0) healthStatus = "normal"
else if (ratio < 200) healthStatus = "critical"
else if (ratio < 400) healthStatus = "attention"
```

---

## Resumo dos arquivos a editar
1. `src/pages/Team.tsx` - Redesign do card (foto+nome+permissao na linha 1, sem cargos, carga no final)
2. `src/pages/Settings.tsx` - Corrigir visibilidade da aba Cargos com scroll horizontal
3. `src/hooks/useDashboard.ts` - Corrigir logica de saude quando peso = 0
