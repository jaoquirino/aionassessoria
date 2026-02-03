import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Shield } from "lucide-react";
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

// Credenciais especiais de setup
const SETUP_USERNAME = "admin";
const SETUP_PASSWORD = "9Ov?w+5a}8qH/H=ht6ET";

const emailSchema = z.string().email("Email inválido");

// Validação de senha forte para criação de conta
const strongPasswordSchema = z.string()
  .min(12, "Senha deve ter no mínimo 12 caracteres")
  .regex(/[a-z]/, "Senha deve conter letra minúscula")
  .regex(/[A-Z]/, "Senha deve conter letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter número")
  .regex(/[^a-zA-Z0-9]/, "Senha deve conter caractere especial");

// Função para obter requisitos da senha com status
const getPasswordRequirements = (password: string) => [
  { label: "Mínimo 12 caracteres", met: password.length >= 12 },
  { label: "Letra minúscula (a-z)", met: /[a-z]/.test(password) },
  { label: "Letra maiúscula (A-Z)", met: /[A-Z]/.test(password) },
  { label: "Número (0-9)", met: /[0-9]/.test(password) },
  { label: "Caractere especial (!@#$...)", met: /[^a-zA-Z0-9]/.test(password) },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [isSetupMode, setIsSetupMode] = useState(false);

  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};

    // No setup mode, validamos email; no login normal também
    if (!isSetupMode || !isLogin) {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }
    }

    // Validação de senha forte apenas para criação de conta (não para login)
    if (!isLogin || isSetupMode) {
      const passwordResult = strongPasswordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = "Nome é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar credenciais especiais de setup
    if (isLogin && !isSetupMode) {
      if (email === SETUP_USERNAME && password === SETUP_PASSWORD) {
        setIsSetupMode(true);
        setIsLogin(false);
        setEmail("");
        setPassword("");
        toast.info("Modo de configuração ativado! Crie sua conta de administrador.");
        return;
      }
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin && !isSetupMode) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Confirme seu email antes de fazer login");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/", { replace: true });
        }
      } else {
        // Criando conta (setup mode ou signup normal)
        const { error } = await signUp(email, password, fullName, isSetupMode);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Este email já está cadastrado");
          } else {
            toast.error(error.message);
          }
        } else {
          if (isSetupMode) {
            toast.success("Conta de administrador criada! Verifique seu email para confirmar o cadastro.");
          } else {
            toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
          }
          setIsSetupMode(false);
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitSetupMode = () => {
    setIsSetupMode(false);
    setIsLogin(true);
    setEmail("");
    setPassword("");
    setFullName("");
    setErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <img 
              src={logoDark} 
              alt="AION Assessoria" 
              className="h-16 w-auto dark:block hidden"
            />
            <img 
              src={logoLight} 
              alt="AION Assessoria" 
              className="h-16 w-auto dark:hidden block"
            />
          </div>

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
            {/* Nome - apenas no signup */}
            {(!isLogin || isSetupMode) && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type={isLogin && !isSetupMode ? "text" : "email"}
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              
              {/* Requisitos de senha - mostrar apenas ao criar conta */}
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

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
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
                <button
                  type="button"
                  onClick={exitSetupMode}
                  className="text-primary hover:underline font-medium"
                >
                  ← Voltar ao login
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
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
