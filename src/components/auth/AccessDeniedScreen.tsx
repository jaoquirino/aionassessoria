 import { motion } from "framer-motion";
 import { ShieldX, LogIn } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 
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
         <div className="flex justify-center">
           <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center">
             <ShieldX className="h-10 w-10 text-destructive" />
           </div>
         </div>
         
         <div className="space-y-2">
           <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
           <p className="text-muted-foreground">
             Você não tem permissão para acessar o sistema. Entre em contato com um administrador para solicitar acesso.
           </p>
         </div>
 
         <Button onClick={handleBackToLogin} className="gap-2 w-full">
           <LogIn className="h-4 w-4" />
           Voltar para Login
         </Button>
       </motion.div>
     </div>
   );
 }