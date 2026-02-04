import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export function MainLayout() {
  const { isDark, toggleTheme } = useUserPreferences();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isDarkMode={isDark} onToggleTheme={toggleTheme} />
      <main
        className={cn(
          "min-h-screen transition-all duration-300 pl-64"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
