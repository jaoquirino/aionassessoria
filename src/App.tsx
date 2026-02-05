import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useIsAdmin, useIsTeamMember } from "@/hooks/useUserRoles";
import { Loader2 } from "lucide-react";
import { NotificationToastContainer } from "@/components/notifications/NotificationCenter";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientOnboarding from "./pages/ClientOnboarding";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import Modules from "./pages/Modules";
import Settings from "./pages/Settings";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { data: isTeamMember, isLoading: isTeamMemberLoading } = useIsTeamMember();

  if (loading || isTeamMemberLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User has no role - redirect to auth
  if (!isTeamMember) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <NotificationToastContainer />
      <MainLayout />
    </>
  );
}

// Wrapper to check admin permission for routes
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: currentMember, isLoading } = useCurrentTeamMember();
  const { data: isAdminByRole, isLoading: isAdminLoading } = useIsAdmin();
  
  if (isLoading || isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const isAdmin = currentMember?.permission === "admin" || !!isAdminByRole;
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<AdminRoute><Clients /></AdminRoute>} />
            <Route path="/clientes/:clientId/onboarding" element={<ClientOnboarding />} />
            <Route path="/tarefas" element={<Tasks />} />
            <Route path="/equipe" element={<AdminRoute><Team /></AdminRoute>} />
            <Route path="/modulos" element={<AdminRoute><Modules /></AdminRoute>} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/onboarding-templates" element={<Navigate to="/configuracoes" replace />} />
            {/* Redirect old routes */}
            <Route path="/contratos" element={<Navigate to="/clientes" replace />} />
            <Route path="/permissoes" element={<Navigate to="/configuracoes" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
