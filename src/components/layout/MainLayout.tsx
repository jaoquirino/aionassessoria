import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";

export function MainLayout() {
  useGlobalRealtime();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={
          isMobile
            ? "min-h-screen pt-14"
            : "min-h-screen transition-all duration-300 pl-64 peer-data-[collapsed=true]:pl-[72px]"
        }
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
