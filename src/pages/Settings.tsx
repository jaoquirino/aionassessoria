import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Save, User, Palette, Shield, ShieldCheck, UserX, Loader2, Search, UserPlus, Camera, Key, Sun, Moon, Monitor, Trash2, ClipboardList, Archive, AtSign, Puzzle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUsersWithRoles, useSetUserRole, useRemoveUserRole, type AppRole } from "@/hooks/useUserRoles";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, type ThemePreference } from "@/hooks/useUserPreferences";
import { useCapacitySettings } from "@/hooks/useCapacitySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AvatarCropDialog } from "@/components/settings/AvatarCropDialog";
import { PasswordInput } from "@/components/settings/PasswordInput";
import { PasswordRequirements } from "@/components/settings/PasswordRequirements";
import { isPasswordStrong } from "@/lib/passwordValidation";
import { OnboardingTemplatesTab } from "@/components/settings/OnboardingTemplatesTab";
import { ArchivedTasksTab } from "@/components/settings/ArchivedTasksTab";

import { CreateUserDialog } from "@/components/settings/CreateUserDialog";
import { RolesManagementTab } from "@/components/settings/RolesManagementTab";
import { PrioritiesManagementTab } from "@/components/settings/PrioritiesManagementTab";
import { SavedColorsManagementTab } from "@/components/settings/SavedColorsManagementTab";
import { ModulesManagementTab } from "@/components/settings/ModulesManagementTab";
import { UserSettingsDialog } from "@/components/settings/UserSettingsDialog";
// ModulePermissionsTab moved into UserSettingsDialog
import { useQueryClient } from "@tanstack/react-query";
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
import { capitalizeName } from "@/lib/utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<import("@/hooks/useUserRoles").UserWithRole | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User profile state
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  
  // Avatar crop dialog
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordState, setCurrentPasswordState] = useState<"valid" | "invalid" | "verifying" | null>(null);
  // (reserved) could be used for debounced password verification

  // Theme preferences
  const { theme, setTheme, isDark } = useUserPreferences();

  // Capacity settings
  const { settings: capacitySettings, updateSettings: updateCapacitySettings, updateTypeWeight } = useCapacitySettings();
  const [capacityLimit, setCapacityLimit] = useState(capacitySettings.defaultCapacityLimit.toString());
  const [alertAt80, setAlertAt80] = useState(capacitySettings.alertAt80Percent);
  const [blockAboveLimit, setBlockAboveLimit] = useState(capacitySettings.blockAboveLimit);
  const [recurringWeight, setRecurringWeight] = useState(capacitySettings.typeWeights.recurring.toString());
  const [planningWeight, setPlanningWeight] = useState(capacitySettings.typeWeights.planning.toString());
  const [projectWeight, setProjectWeight] = useState(capacitySettings.typeWeights.project.toString());
  const [extraWeight, setExtraWeight] = useState(capacitySettings.typeWeights.extra.toString());

  const { data: users, isLoading: usersLoading } = useUsersWithRoles();
  const { data: currentMember } = useCurrentTeamMember();
  const isAdmin = currentMember?.permission === "admin";
  const setRole = useSetUserRole();
  const removeRole = useRemoveUserRole();

  // Load user profile
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setFullName(data.full_name || "");
      setAvatarUrl(data.avatar_url || "");
      setUsername(data.username || "");
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    // Create URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleCroppedImageUpload = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setIsUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithBuster = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithBuster);

      // Update profile
      await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          avatar_url: urlWithBuster,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      toast.success("Foto atualizada");
      setCropDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setIsRemovingAvatar(true);
    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([`${user.id}/avatar.jpg`]);

      // Ignore error if file doesn't exist
      if (deleteError && !deleteError.message.includes("not found")) {
        throw deleteError;
      }

      // Update profile to remove avatar URL
      await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      setAvatarUrl("");
      toast.success("Foto removida");
    } catch (error: any) {
      toast.error("Erro ao remover foto: " + error.message);
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    try {
      // Check if username is taken by another user
      if (username.trim()) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username.trim())
          .neq("user_id", user.id)
          .maybeSingle();
        
        if (existingUser) {
          toast.error("Este nome de usuário já está em uso");
          setIsSavingProfile(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim() ? capitalizeName(fullName.trim()) : null,
          username: username.trim() || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isPasswordStrong(newPassword)) {
      toast.error("A nova senha não atende aos requisitos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!currentPassword) {
      toast.error("Digite sua senha atual");
      return;
    }

    setIsChangingPassword(true);
    setCurrentPasswordState("verifying");
    
    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setCurrentPasswordState("invalid");
        toast.error("Senha atual incorreta");
        setIsChangingPassword(false);
        return;
      }

      setCurrentPasswordState("valid");

      // Then update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordState(null);
    } catch (error: any) {
      toast.error("Erro ao alterar senha: " + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Sync capacity state when settings change
  useEffect(() => {
    setCapacityLimit(capacitySettings.defaultCapacityLimit.toString());
    setAlertAt80(capacitySettings.alertAt80Percent);
    setBlockAboveLimit(capacitySettings.blockAboveLimit);
    setRecurringWeight(capacitySettings.typeWeights.recurring.toString());
    setPlanningWeight(capacitySettings.typeWeights.planning.toString());
    setProjectWeight(capacitySettings.typeWeights.project.toString());
    setExtraWeight(capacitySettings.typeWeights.extra.toString());
  }, [capacitySettings]);

  const handleSaveCapacitySettings = () => {
    const limit = parseInt(capacityLimit) || 15;
    updateCapacitySettings({
      defaultCapacityLimit: limit,
      alertAt80Percent: alertAt80,
      blockAboveLimit: blockAboveLimit,
    });
    toast.success("Configurações de capacidade salvas");
  };

  const handleSaveWeights = () => {
    updateCapacitySettings({
      typeWeights: {
        recurring: parseInt(recurringWeight) || 2,
        planning: parseInt(planningWeight) || 1,
        project: parseInt(projectWeight) || 4,
        extra: parseInt(extraWeight) || 3,
      },
    });
    toast.success("Pesos salvos com sucesso");
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRoleChange = (userId: string, role: string, teamConfig?: { roles?: string; capacityLimit?: number; restrictedView?: boolean }) => {
    if (role === "none") {
      removeRole.mutate(userId);
    } else {
      setRole.mutate({ userId, role: role as AppRole, teamConfig });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsDeletingUserId(userId);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida");

      const { data, error } = await supabase.functions.invoke("delete-user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário excluído");
      // Refresh lists
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir usuário");
    } finally {
      setIsDeletingUserId(null);
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
    if (role === "gestor") {
      return (
        <Badge className="bg-info text-info-foreground">
          <Shield className="h-3 w-3 mr-1" />
          Gestor
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Shield className="h-3 w-3 mr-1" />
        Operacional
      </Badge>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize o sistema para sua agência
        </p>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="glass h-auto gap-1 p-1 flex flex-nowrap overflow-x-auto w-full justify-start">
            <TabsTrigger value="general" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="onboarding" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Onboarding</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="archived" className="gap-2">
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Tarefas</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="modules" className="gap-2">
                <Puzzle className="h-4 w-4" />
                <span className="hidden sm:inline">Módulos</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="permissions" className="gap-2 relative">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
                {(users?.filter(u => !u.role).length ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
                    {users?.filter(u => !u.role).length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Seu Perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Informações da sua conta
                </p>
              </div>
              <Separator />
              
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-xl">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3 text-primary-foreground" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">Clique no ícone para alterar sua foto</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 5MB.</p>
                  {avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isRemovingAvatar}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 px-2 h-7"
                    >
                      {isRemovingAvatar ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>

              {/* Avatar Crop Dialog */}
              <AvatarCropDialog
                open={cropDialogOpen}
                onOpenChange={setCropDialogOpen}
                imageSrc={selectedImageSrc}
                onCropComplete={handleCroppedImageUpload}
                isSaving={isUploadingAvatar}
              />

              {/* Username - readonly */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AtSign className="h-4 w-4" />
                  Usuário
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu nome de usuário"
                />
                <p className="text-xs text-muted-foreground">
                  O nome de usuário é usado para login
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                />
                <p className="text-xs text-muted-foreground">
                  Quando preenchido, o nome será exibido no lugar do usuário
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>

            {/* Password Change */}
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Alterar Senha
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mínimo de 12 caracteres com letras, números e símbolos
                </p>
              </div>
              <Separator />
              
              <div className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(val) => {
                      setCurrentPassword(val);
                      // Reset validation when typing
                      if (currentPasswordState !== null) {
                        setCurrentPasswordState(null);
                      }
                    }}
                    validationState={currentPasswordState}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={setNewPassword}
                    validationState={newPassword ? (isPasswordStrong(newPassword) ? "valid" : "invalid") : null}
                  />
                  <PasswordRequirements password={newPassword} show={newPassword.length > 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    validationState={
                      confirmPassword
                        ? confirmPassword === newPassword
                          ? "valid"
                          : "invalid"
                        : null
                    }
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || !isPasswordStrong(newPassword) || newPassword !== confirmPassword}
                variant="outline"
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                {isChangingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </TabsContent>




          <TabsContent value="appearance" className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Tema</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha entre modo claro, escuro ou automático
                </p>
              </div>
              <Separator />
              
              <div className="space-y-4">
                <Label>Selecione o tema</Label>
                <ToggleGroup
                  type="single"
                  value={theme}
                  onValueChange={(value) => value && setTheme(value as ThemePreference)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="light" aria-label="Modo Claro" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Sun className="h-4 w-4" />
                    Claro
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" aria-label="Modo Escuro" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Moon className="h-4 w-4" />
                    Escuro
                  </ToggleGroupItem>
                  <ToggleGroupItem value="system" aria-label="Automático" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Monitor className="h-4 w-4" />
                    Automático
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                  {theme === "system" 
                    ? `Usando tema do sistema (${isDark ? "escuro" : "claro"})` 
                    : theme === "dark" 
                      ? "Tema escuro ativado" 
                      : "Tema claro ativado"}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="glass rounded-xl p-6 space-y-6">
                <PrioritiesManagementTab />
              </div>
            )}

            {isAdmin && (
              <div className="glass rounded-xl p-6 space-y-6">
                <SavedColorsManagementTab />
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="onboarding" className="space-y-6">
              <OnboardingTemplatesTab />
            </TabsContent>
          )}


          {isAdmin && (
            <TabsContent value="permissions" className="space-y-6">
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
                      Gestores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users?.filter(u => u.role === "gestor").length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gestão de equipe
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Operacionais
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

              {/* Pending Users Alert */}
              {(() => {
                const pendingUsers = users?.filter(u => !u.role) || [];
                if (pendingUsers.length === 0) return null;
                return (
                  <Card className="border-warning/50 bg-warning/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                        <Clock className="h-4 w-4" />
                        {pendingUsers.length} {pendingUsers.length === 1 ? 'usuário aguardando' : 'usuários aguardando'} aprovação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pendingUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{getInitials(u.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{u.full_name || "Nome não informado"}</p>
                              <p className="text-xs text-muted-foreground">
                                Cadastrado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              onClick={() => {
                                // Open modal with this pending user - defaults will be applied
                                setSelectedUser({
                                  ...u,
                                  // Pre-set defaults for approval
                                  _pendingApproval: true,
                                } as any);
                              }}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Aprovar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Search and Add */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setCreateUserDialogOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Usuário
                </Button>
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
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </p>
                      ) : (
                        filteredUsers.map((u, index) => (
                          <motion.div
                            key={u.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors cursor-pointer"
                            onClick={() => setSelectedUser(u)}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {u.full_name || "Nome não informado"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{u.username || "sem_username"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cadastrado em {new Date(u.created_at).toLocaleDateString("pt-BR")} às{" "}
                                  {new Date(u.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {getRoleBadge(u.role)}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Settings Dialog */}
              <UserSettingsDialog
                user={selectedUser}
                open={!!selectedUser}
                onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
                currentUserId={user?.id}
                onRoleChange={handleRoleChange}
                onDelete={handleDeleteUser}
                isDeletingUserId={isDeletingUserId}
              />

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
                      Acesso total: pode criar, editar e excluir clientes, contratos, tarefas, módulos e membros. Gerencia permissões.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-info text-info-foreground shrink-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Gestor
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Gestão de equipe: pode visualizar permissões, gerenciar tarefas e integrantes conforme configurado.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="shrink-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Operacional
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Acesso operacional: pode visualizar e editar dados, criar tarefas. Não pode excluir ou gerenciar equipe.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-muted-foreground shrink-0">
                      <UserX className="h-3 w-3 mr-1" />
                      Sem acesso
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Usuário cadastrado mas sem permissão para acessar o sistema.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Roles Management */}
              <RolesManagementTab />
            </TabsContent>
          )}

          {/* Archived Tasks Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="archived">
              <ArchivedTasksTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="modules">
              <ModulesManagementTab />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* Invite Dialog */}
      {/* Create User Dialog */}
      <CreateUserDialog 
        open={createUserDialogOpen} 
        onOpenChange={setCreateUserDialogOpen} 
      />
    </div>
  );
}
