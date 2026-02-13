 import { useState } from "react";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Badge } from "@/components/ui/badge";
 import { X, Eye, EyeOff, Loader2, AtSign } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { cn } from "@/lib/utils";
 import { PasswordRequirements } from "./PasswordRequirements";
 import { isPasswordStrong } from "@/lib/passwordValidation";
 import { useQueryClient } from "@tanstack/react-query";
 import { useRoleNames } from "@/hooks/useAvailableRoles";
 
 interface CreateUserDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
   const queryClient = useQueryClient();
   const roleOptions = useRoleNames();
   
   // Step 1: Credentials
   const [step, setStep] = useState<1 | 2>(1);
   const [username, setUsername] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   
   // Step 2: Roles
   const [fullName, setFullName] = useState("");
   const [roles, setRoles] = useState<string[]>([]);
   const [permission, setPermission] = useState("operational");
   
   const [isCreating, setIsCreating] = useState(false);
 
   const handleClose = () => {
     onOpenChange(false);
     // Reset form after close animation
     setTimeout(() => {
       setStep(1);
       setUsername("");
       setPassword("");
       setFullName("");
       setRoles([]);
       setPermission("operational");
     }, 200);
   };
 
   const handleNextStep = () => {
     if (!username.trim()) {
       toast.error("Digite um nome de usuário");
       return;
     }
     if (!isPasswordStrong(password)) {
       toast.error("A senha não atende aos requisitos de segurança");
       return;
     }
     setStep(2);
   };
 
   const handleAddRole = (role: string) => {
     if (!roles.includes(role)) {
       setRoles([...roles, role]);
     }
   };
 
   const handleRemoveRole = (role: string) => {
     setRoles(roles.filter(r => r !== role));
   };
 
   const handleCreate = async () => {
     if (roles.length === 0) {
       toast.error("Selecione pelo menos um cargo");
       return;
     }
 
     setIsCreating(true);
     try {
       const { data: session } = await supabase.auth.getSession();
       
       const response = await supabase.functions.invoke('create-user', {
         headers: {
           Authorization: `Bearer ${session.session?.access_token}`,
         },
         body: {
           username: username.trim(),
           password,
           fullName: fullName.trim() || null,
           roles,
           permission,
         },
       });
 
       if (response.error) {
         throw new Error(response.error.message || "Erro ao criar usuário");
       }
 
       if (response.data?.error) {
         throw new Error(response.data.error);
       }
 
       toast.success("Usuário criado com sucesso!");
       queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
       queryClient.invalidateQueries({ queryKey: ["team_members"] });
       handleClose();
     } catch (error: any) {
       toast.error(error.message || "Erro ao criar usuário");
     } finally {
       setIsCreating(false);
     }
   };
 
   const availableRoles = roleOptions.filter(r => !roles.includes(r));
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>
             {step === 1 ? "Criar Usuário" : "Definir Cargos"}
           </DialogTitle>
           <DialogDescription>
             {step === 1 
               ? "Defina as credenciais de acesso do novo usuário"
               : "Selecione os cargos e funções do usuário"
             }
           </DialogDescription>
         </DialogHeader>
 
         {step === 1 && (
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="username" className="flex items-center gap-2">
                 <AtSign className="h-4 w-4" />
                 Usuário *
               </Label>
               <Input
                 id="username"
                 value={username}
                 onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                 placeholder="nome.usuario"
                 autoComplete="off"
               />
               <p className="text-xs text-muted-foreground">
                 Será usado para login. Não pode conter espaços.
               </p>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="password">Senha *</Label>
               <div className="relative">
                 <Input
                   id="password"
                   type={showPassword ? "text" : "password"}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="Mínimo 12 caracteres"
                   autoComplete="new-password"
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                 >
                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
               </div>
               <PasswordRequirements password={password} />
             </div>
           </div>
         )}
 
         {step === 2 && (
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="fullName">Nome completo (opcional)</Label>
               <Input
                 id="fullName"
                 value={fullName}
                 onChange={(e) => setFullName(e.target.value)}
                 placeholder="Nome do colaborador"
               />
               <p className="text-xs text-muted-foreground">
                 Se não preenchido, o usuário será exibido pelo username
               </p>
             </div>
 
             <div className="space-y-2">
               <Label>Cargos / Funções *</Label>
               <p className="text-xs text-muted-foreground">Selecione os cargos que o usuário exercerá</p>
               
               {/* Selected Roles */}
               <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-md bg-muted/30">
                 {roles.length === 0 ? (
                   <span className="text-sm text-muted-foreground">Nenhum cargo selecionado</span>
                 ) : (
                   roles.map((role) => (
                     <Badge 
                       key={role} 
                       variant="secondary" 
                       className="gap-1 pr-1"
                     >
                       {role}
                       <button
                         type="button"
                         onClick={() => handleRemoveRole(role)}
                         className="rounded-full p-0.5 hover:bg-destructive/20"
                       >
                         <X className="h-3 w-3" />
                       </button>
                     </Badge>
                   ))
                 )}
               </div>
 
               {/* Add Role */}
               {availableRoles.length > 0 && (
                 <Select value="" onValueChange={handleAddRole}>
                   <SelectTrigger>
                     <SelectValue placeholder="Adicionar cargo..." />
                   </SelectTrigger>
                   <SelectContent>
                     {availableRoles.map((r) => (
                       <SelectItem key={r} value={r}>{r}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="permission">Nível de Permissão no Sistema</Label>
               <Select value={permission} onValueChange={setPermission}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="admin">Admin (acesso total)</SelectItem>
                   <SelectItem value="operational">Operacional (acesso padrão)</SelectItem>
                 </SelectContent>
               </Select>
               <p className="text-xs text-muted-foreground">
                 Admins podem criar usuários e gerenciar configurações
               </p>
             </div>
           </div>
         )}
 
         <DialogFooter className="gap-2">
           {step === 2 && (
             <Button variant="outline" onClick={() => setStep(1)}>
               Voltar
             </Button>
           )}
           <Button variant="outline" onClick={handleClose}>
             Cancelar
           </Button>
           {step === 1 ? (
             <Button onClick={handleNextStep} disabled={!username.trim() || !isPasswordStrong(password)}>
               Próximo
             </Button>
           ) : (
             <Button onClick={handleCreate} disabled={isCreating || roles.length === 0}>
               {isCreating ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Criando...
                 </>
               ) : (
                 "Criar Usuário"
               )}
             </Button>
           )}
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }