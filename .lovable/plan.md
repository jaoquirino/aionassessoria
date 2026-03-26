

## Plano: Simplificar "Esqueceu a senha" (sem email)

### Contexto
- Hostinger não suporta registros NS na zona DNS (só no domínio inteiro)
- Mudar nameservers do domínio principal quebraria site e app
- Usuário não quer usar serviços externos
- O fluxo de reset administrativo (`must_reset_password`) já funciona perfeitamente

### Alterações

**1. `src/components/auth/ForgotPasswordDialog.tsx`**
- Remover todo o formulário de email, validação Zod, e chamada a `resetPassword`
- Substituir por um dialog simples com:
  - Icone informativo
  - Título: "Esqueceu sua senha?"
  - Mensagem: "Entre em contato com um administrador do sistema para redefinir sua senha."
  - Botão "Entendi" que fecha o dialog
- Remover imports desnecessários (`z`, `Mail`, `Loader2`, `CheckCircle`, `useAuth`, `toast`)

**2. `src/hooks/useAuth.ts`**
- Remover a função `resetPassword` (não será mais utilizada por nenhum componente)
- Manter todo o resto intacto

### Fluxo resultante
1. Usuário esquece a senha → clica "Esqueceu sua senha?" → vê mensagem para contatar admin
2. Admin vai em Permissões → clica "Resetar Senha" no menu do usuário
3. Sistema marca `must_reset_password = true`
4. No próximo login, o usuário digita o username → sistema detecta a flag → redireciona para tela de criar nova senha
5. Zero dependência de email ou serviços externos

### Arquivos afetados
- `src/components/auth/ForgotPasswordDialog.tsx` — simplificar
- `src/hooks/useAuth.ts` — remover `resetPassword`

