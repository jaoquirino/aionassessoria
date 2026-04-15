import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfileDropdownProps {
  isCollapsed?: boolean;
  isTopbar?: boolean;
}

export function UserProfileDropdown({ isCollapsed = false, isTopbar = false }: UserProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; username: string | null }>({
    full_name: null,
    avatar_url: null,
    username: null,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Subscribe to profile changes for real-time avatar updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newProfile = payload.new as { full_name: string | null; avatar_url: string | null; username: string | null };
            setProfile({
              full_name: newProfile.full_name,
              avatar_url: newProfile.avatar_url,
              username: newProfile.username,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Até logo!");
      navigate("/auth", { replace: true });
    }
  };

  const getDisplayName = () => {
    const full = profile.full_name || profile.username || user?.email?.split("@")[0] || "Usuário";
    return full.split(" ")[0];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-all duration-200",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(getDisplayName())}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium truncate">{getDisplayName()}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side="top" 
        align={isCollapsed ? "center" : "start"}
        className="w-56"
      >
        <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
