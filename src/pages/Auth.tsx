import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, Shield, Key, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Badge } from "@/components/ui/badge";
import { strongPasswordSchema, getPasswordRequirements } from "@/lib/passwordValidation";
import { supabase } from "@/integrations/supabase/client";

const usernameSchema = z.string()
  .min(3, "Username deve ter no mínimo 3 caracteres")
  .regex(/^[a-zA-Z0-9_.]+$/, "Username pode conter apenas letras, números, _ e .");

const generateInternalEmail = (username: string) => {
  const lower = username.toLowerCase();
  if (lower.includes('@')) return lower;
  return `${lower}@internal.local`;
};

const generateLegacyEmail = (username: string) => `${username.toLowerCase()}@aionassessoria.com`;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; fullName?: string; setupToken?: string }>({});
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [showSetupTokenInput, setShowSetupTokenInput] = useState(false);

  // Password reset flow state
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetErrors, setResetErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const { user, loading, signIn, signUp, checkHasAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetupNeeded = async () => {
      try {
        const hasAdmin = await checkHasAdmin();
        if (!hasAdmin) setShowSetupTokenInput(true);
      } catch {
        console.error("Error checking admin status");
      }
    };
    checkSetupNeeded();
  }, [checkHasAdmin]);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string; fullName?: string; setupToken?: string } = {};
    const usernameResult = usernameSchema.safeParse(username);
    if (!usernameResult.success) newErrors.username = usernameResult.error.errors[0].message;

    if (!isLogin || isSetupMode) {
      const passwordResult = strongPasswordSchema.safeParse(password);
      if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    } else if (isLogin && !password.trim()) {
      // For login, password can be empty if checking must_reset_password
      // Don't validate - we'll check must_reset_password first
    }

    if (isSetupMode && !setupToken.trim()) newErrors.setupToken = "Token de setup é obrigatório";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetupTokenSubmit = async () => {
    if (!setupToken.trim()) {
      setErrors({ setupToken: "Token de setup é obrigatório" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-setup-token', {
        body: { token: setupToken }
      });
      if (error || !data?.valid) {
        toast.error(data?.error || "Token inválido");
        setErrors({ setupToken: data?.error || "Token inválido" });
      } else {
        setIsSetupMode(true);
        setIsLogin(false);
        setShowSetupTokenInput(false);
        toast.info("Modo de configuração ativado! Crie sua conta de administrador.");
      }
    } catch {
      toast.error("Erro ao validar token");
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkMustResetPassword = async (usernameValue: string): Promise<boolean> => {
    try {
      const { data } = await supabase.rpc("check_must_reset_password", {
        _username: usernameValue.toLowerCase(),
      });
      return data === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Always check must_reset_password first for login mode
    if (isLogin && !isSetupMode) {
      const usernameResult = usernameSchema.safeParse(username);
      if (!usernameResult.success) {
        setErrors({ username: usernameResult.error.errors[0].message });
        return;
      }
      setIsSubmitting(true);
      const needsReset = await checkMustResetPassword(username);
      setIsSubmitting(false);
      if (needsReset) {
        setMustResetPassword(true);
        return;
      }
      if (!password.trim()) {
        setErrors({ password: "Digite sua senha" });
        return;
      }
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    const internalEmail = generateInternalEmail(username);

    try {
      if (isLogin && !isSetupMode) {
        let { error } = await signIn(internalEmail, password);
        if (error && error.message.includes("Invalid login credentials")) {
          const legacyEmail = generateLegacyEmail(username);
          const legacyResult = await signIn(legacyEmail, password);
          error = legacyResult.error;
        }
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            // Check if this user needs password reset
            const needsReset = await checkMustResetPassword(username);
            if (needsReset) {
              setMustResetPassword(true);
            } else {
              toast.error("Usuário ou senha incorretos");
            }
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Confirme seu cadastro antes de fazer login");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/", { replace: true });
        }
      } else {
        const { data, error } = await signUp(internalEmail, password, fullName || username, isSetupMode);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Este username já está em uso");
          } else {
            toast.error(error.message);
          }
        } else {
          if (data?.user) {
            await supabase.from("profiles").upsert({
              user_id: data.user.id,
              username: username.toLowerCase(),
              full_name: fullName.trim() || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          }
          if (isSetupMode) {
            toast.success("Conta de administrador criada!");
            navigate("/", { replace: true });
          } else {
            await supabase.auth.signOut();
            toast.success("Conta criada com sucesso! Aguarde a aprovação de um administrador para acessar o sistema.", { duration: 6000 });
          }
          setIsSetupMode(false);
          setIsLogin(true);
          setUsername("");
          setPassword("");
          setFullName("");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    const passwordResult = strongPasswordSchema.safeParse(newPassword);
    if (!passwordResult.success) newErrors.newPassword = passwordResult.error.errors[0].message;
    if (newPassword !== confirmNewPassword) newErrors.confirmPassword = "As senhas não coincidem";

    setResetErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-new-password", {
        body: { username: username.toLowerCase(), newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Senha criada com sucesso! Faça login com sua nova senha.");
      setMustResetPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir nova senha");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitSetupMode = () => {
    setIsSetupMode(false);
    setIsLogin(true);
    setUsername("");
    setPassword("");
    setFullName("");
    setSetupToken("");
    setErrors({});
    setShowSetupTokenInput(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password reset screen
  if (mustResetPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8 shadow-xl">
            <div className="flex justify-center mb-6">
              <img src={logoLight} alt="AION Assessoria" className="h-16 w-auto dark:block hidden" />
              <img src={logoDark} alt="AION Assessoria" className="h-16 w-auto dark:hidden block" />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Criar nova senha</h1>
              <p className="text-muted-foreground mt-2">
                Sua senha foi resetada. Crie uma nova senha para continuar.
              </p>
            </div>

            <form onSubmit={handleSetNewPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {resetErrors.newPassword && <p className="text-sm text-destructive">{resetErrors.newPassword}</p>}
                {newPassword.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos da senha:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {getPasswordRequirements(newPassword).map((req, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {resetErrors.confirmPassword && <p className="text-sm text-destructive">{resetErrors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setMustResetPassword(false); setNewPassword(""); setConfirmNewPassword(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                ← Voltar ao login
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoLight} alt="AION Assessoria" className="h-16 w-auto dark:block hidden" />
            <img src={logoDark} alt="AION Assessoria" className="h-16 w-auto dark:hidden block" />
          </div>

          {/* Setup Token Input */}
          {showSetupTokenInput && !isSetupMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-primary" />
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  Configuração Inicial
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sistema ainda não configurado. Insira o token de setup para criar a conta de administrador.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Token de setup"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.setupToken && <p className="text-sm text-destructive">{errors.setupToken}</p>}
                <Button onClick={handleSetupTokenSubmit} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando...</>
                  ) : "Validar Token"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Setup Mode Banner */}
          {isSetupMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  Configuração Inicial
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Crie sua conta de administrador. Esta conta terá <strong>permissões totais</strong> para gerenciar o sistema.
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  className="pl-10"
                  autoComplete="username"
                />
              </div>
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>

            {/* Name - optional for signup */}
            {(!isLogin || isSetupMode) && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome (opcional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    autoComplete="name"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pode ser adicionado ou alterado depois nas configurações
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              
              {(!isLogin || isSetupMode) && password.length > 0 && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos da senha:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {getPasswordRequirements(password).map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                        <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isLogin && !isSetupMode && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin && !isSetupMode ? "Entrando..." : "Criando conta..."}
                </>
              ) : (
                <>
                  {isSetupMode && <Shield className="mr-2 h-4 w-4" />}
                  {isLogin && !isSetupMode ? "Entrar" : isSetupMode ? "Criar conta admin" : "Criar conta"}
                </>
              )}
            </Button>
          </form>

          <ForgotPasswordDialog 
            open={showForgotPassword} 
            onOpenChange={setShowForgotPassword} 
          />

          {/* Toggle */}
          <div className="mt-6 text-center">
            {isSetupMode ? (
              <p className="text-muted-foreground">
                <button type="button" onClick={exitSetupMode} className="text-primary hover:underline font-medium">
                  ← Voltar ao login
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  {isLogin ? "Criar conta" : "Entrar"}
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
