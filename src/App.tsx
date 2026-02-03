import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientOnboarding from "./pages/ClientOnboarding";
import Contracts from "./pages/Contracts";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import Modules from "./pages/Modules";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/clientes/:clientId/onboarding" element={<ClientOnboarding />} />
            <Route path="/contratos" element={<Contracts />} />
            <Route path="/tarefas" element={<Tasks />} />
            <Route path="/equipe" element={<Team />} />
            <Route path="/modulos" element={<Modules />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
