import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientOnboarding from "./pages/ClientOnboarding";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import Modules from "./pages/Modules";
import Settings from "./pages/Settings";
import OnboardingTemplates from "./pages/OnboardingTemplates";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <MainLayout />;
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
            <Route path="/clientes" element={<Clients />} />
            <Route path="/clientes/:clientId/onboarding" element={<ClientOnboarding />} />
            <Route path="/tarefas" element={<Tasks />} />
            <Route path="/equipe" element={<Team />} />
            <Route path="/modulos" element={<Modules />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/onboarding-templates" element={<OnboardingTemplates />} />
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
