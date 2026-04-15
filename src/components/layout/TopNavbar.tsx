import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CalendarDays,
  UserCircle,
  DollarSign,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { NotificationBell } from "@/components/notifications/NotificationCenter";
import { useMyModulePermissions } from "@/hooks/useModulePermissions";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import logoIcon from "@/assets/logo-icon.png";

const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, moduleKey: "dashboard" },
  { name: "Clientes", href: "/clientes", icon: Users, adminOnly: true, moduleKey: "clients" },
  { name: "Tarefas", href: "/tarefas", icon: CheckSquare, moduleKey: "tasks" },
  { name: "Calendário", href: "/calendario", icon: CalendarDays, moduleKey: "calendar" },
  { name: "Equipe", href: "/equipe", icon: UserCircle, adminOnly: true, moduleKey: "team" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, adminOnly: true, moduleKey: "financial" },
];

export function TopNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: currentMember } = useCurrentTeamMember();
  const { isDark, toggleTheme } = useUserPreferences();
  const isMobile = useIsMobile();
  const { data: modulePerms = [] } = useMyModulePermissions();
  const { data: isAdminRole } = useIsAdmin();

  const isAdmin = currentMember?.permission === "admin" || !!isAdminRole;
  const isGestor = currentMember?.permission === "gestor";

  const navigation = allNavigation.filter((item) => {
    if (item.adminOnly && !isAdmin && !isGestor) return false;
    if (isAdmin) return true;
    const perm = modulePerms.find((p) => p.module === item.moduleKey);
    return perm ? perm.can_access : true;
  });

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-sidebar backdrop-blur-sm">
        <div className="flex h-full items-center px-4 gap-1">
          {/* Logo */}
          <NavLink to="/" className="flex items-center shrink-0 mr-4">
            {isMobile ? (
              <img src={logoIcon} alt="AION" className="h-7 w-7" />
            ) : (
              <img
                src={isDark ? logoLight : logoDark}
                alt="AION Assessoria"
                className="h-8 w-auto"
              />
            )}
          </NavLink>

          {/* Desktop Nav */}
          {!isMobile && (
            <nav className="flex items-center gap-0.5 flex-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          )}

          {/* Mobile: hamburger */}
          {isMobile && (
            <div className="flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="text-sidebar-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Right side: theme, notifications, profile */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <NotificationBell compact />
            <UserProfileDropdown isCollapsed={false} isTopbar />
          </div>
        </div>
      </header>

      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                <img
                  src={isDark ? logoLight : logoDark}
                  alt="AION Assessoria"
                  className="h-8 w-auto"
                />
              </div>
              <nav className="flex-1 space-y-1 p-3">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
