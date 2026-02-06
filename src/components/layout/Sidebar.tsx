import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  UserCircle,
  Puzzle,
  ChevronLeft,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { NotificationBell } from "@/components/notifications/NotificationCenter";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import logoIcon from "@/assets/logo-icon.png";

const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users, adminOnly: true },
  { name: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { name: "Equipe", href: "/equipe", icon: UserCircle, adminOnly: true },
  { name: "Módulos", href: "/modulos", icon: Puzzle, adminOnly: true },
];

interface SidebarProps {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, onCollapsedChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: currentMember } = useCurrentTeamMember();
  const { isDark, toggleTheme } = useUserPreferences();
  const isMobile = useIsMobile();

  const isAdmin = currentMember?.permission === "admin";
  const navigation = allNavigation.filter(item => !item.adminOnly || isAdmin);

  const navItems = (collapsed: boolean, onNavClick?: () => void) =>
    navigation.map((item) => {
      const isActive = location.pathname === item.href;
      return (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={onNavClick}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
            )}
          />
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {item.name}
            </motion.span>
          )}
        </NavLink>
      );
    });

  const footerContent = (collapsed: boolean) => (
    <div className="border-t border-sidebar-border p-3 space-y-1">
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "default"}
        onClick={toggleTheme}
        className={cn(
          "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center"
        )}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        {!collapsed && <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>}
      </Button>
      {collapsed ? (
        <div className="flex flex-col items-center gap-1">
          <NotificationBell compact />
          <UserProfileDropdown isCollapsed={collapsed} />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <UserProfileDropdown isCollapsed={collapsed} />
          </div>
          <NotificationBell compact />
        </div>
      )}
    </div>
  );

  // Mobile
  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-sidebar px-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-sidebar-foreground">
            <Menu className="h-5 w-5" />
          </Button>
          <img src={logoIcon} alt="AION" className="h-7 w-7" />
          <div className="flex-1" />
          <NotificationBell />
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                <img src={isDark ? logoLight : logoDark} alt="AION Assessoria" className="h-8 w-auto" />
              </div>
              <nav className="flex-1 space-y-1 p-3">{navItems(false, () => setMobileOpen(false))}</nav>
              {footerContent(false)}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header with logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          <div className="relative h-8 flex items-center">
            <AnimatePresence mode="wait">
              {isCollapsed ? (
                <motion.img
                  key="icon"
                  src={logoIcon}
                  alt="AION"
                  className="h-8 w-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                <motion.img
                  key="full"
                  src={isDark ? logoLight : logoDark}
                  alt="AION Assessoria"
                  className="h-8 w-auto"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(true)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(false)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">{navItems(isCollapsed)}</nav>

        {/* Footer */}
        {footerContent(isCollapsed)}
      </div>
    </motion.aside>
  );
}
