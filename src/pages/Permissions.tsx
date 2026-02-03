import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, UserX, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUsersWithRoles, useSetUserRole, useRemoveUserRole, type AppRole } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

export default function Permissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users, isLoading } = useUsersWithRoles();
  const setRole = useSetUserRole();
  const removeRole = useRemoveUserRole();

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRoleChange = (userId: string, role: string) => {
    if (role === "none") {
      removeRole.mutate(userId);
    } else {
      setRole.mutate({ userId, role: role as AppRole });
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <UserX className="h-3 w-3 mr-1" />
          Sem acesso
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge className="bg-primary text-primary-foreground">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Shield className="h-3 w-3 mr-1" />
        Membro
      </Badge>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Permissões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie quem tem acesso ao sistema e seus níveis de permissão
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.role === "admin").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Acesso total ao sistema
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-info" />
              Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.role === "member").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Acesso operacional
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              Sem acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => !u.role).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Cadastrados sem permissão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
          <CardDescription>
            Configure o nível de acesso para cada usuário do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado
              </p>
            ) : (
              filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.full_name || "Nome não informado"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getRoleBadge(user.role)}
                    
                    <Select
                      value={user.role || "none"}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="none">Sem acesso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Níveis de permissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-primary text-primary-foreground shrink-0">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Admin
            </Badge>
            <p className="text-sm text-muted-foreground">
              Acesso total: pode criar, editar e excluir clientes, contratos, tarefas, módulos e membros da equipe. Gerencia permissões.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="shrink-0">
              <Shield className="h-3 w-3 mr-1" />
              Membro
            </Badge>
            <p className="text-sm text-muted-foreground">
              Acesso operacional: pode visualizar e editar dados, criar tarefas e atualizar status. Não pode excluir ou gerenciar equipe.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              <UserX className="h-3 w-3 mr-1" />
              Sem acesso
            </Badge>
            <p className="text-sm text-muted-foreground">
              Usuário cadastrado mas sem permissão para acessar o sistema. Não consegue visualizar nenhum dado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
