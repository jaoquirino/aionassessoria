import { motion } from "framer-motion";
import { Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

export function AccessDeniedScreen() {
  const navigate = useNavigate();

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-6"
      >
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img 
            src={logoLight} 
            alt="AION Assessoria" 
            className="h-12 w-auto dark:block hidden"
          />
          <img 
            src={logoDark} 
            alt="AION Assessoria" 
            className="h-12 w-auto dark:hidden block"
          />
        </div>

        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-warning/20 flex items-center justify-center">
            <Clock className="h-10 w-10 text-warning" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Aguardando Aprovação</h1>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda está aguardando a aprovação de um administrador.
          </p>
          <p className="text-sm text-muted-foreground">
            Assim que seu acesso for liberado, você poderá utilizar o sistema normalmente.
          </p>
        </div>

        <Button onClick={handleBackToLogin} variant="outline" className="gap-2 w-full">
          <LogIn className="h-4 w-4" />
          Voltar para Login
        </Button>
      </motion.div>
    </div>
  );
}
