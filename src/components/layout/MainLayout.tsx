import { Outlet } from "react-router-dom";
import { TopNavbar } from "./TopNavbar";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";

export function MainLayout() {
  useGlobalRealtime();

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="pt-14">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
