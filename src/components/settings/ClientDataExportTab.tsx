import { useState } from "react";
import { Download, FileSpreadsheet, FileCode, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllClients } from "@/hooks/useClients";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  onboarding: "Em Onboarding",
  active: "Ativo",
  paused: "Pausado",
  ended: "Cancelado",
};

export function ClientDataExportTab() {
  const [isExporting, setIsExporting] = useState<"csv" | "xml" | null>(null);
  const { data: clients = [] } = useAllClients();

  const fetchFullClientData = async () => {
    // Fetch clients with all related data
    const { data, error } = await supabase
      .from("clients")
      .select(`
        id, name, status, cnpj, phone, email, created_at, updated_at,
        contracts(
          id, monthly_value, start_date, renewal_date, status, notes, minimum_duration_months,
          contract_modules(
            id, module_id, custom_weight, deliverable_limit, deliverable_used,
            service_module:service_modules(name)
          )
        )
      `)
      .order("name");

    if (error) throw error;

    // Fetch onboarding responses for each client
    const clientsWithResponses = await Promise.all(
      (data || []).map(async (client) => {
        const { data: responses } = await supabase
          .from("client_onboarding_responses")
          .select(`
            *,
            template_step:onboarding_template_steps(title, description)
          `)
          .eq("client_id", client.id);
        
        return { ...client, onboarding_responses: responses || [] };
      })
    );

    return clientsWithResponses;
  };

  const exportToCSV = async () => {
    setIsExporting("csv");
    try {
      const data = await fetchFullClientData();
      
      // Flatten data for CSV
      const rows: string[][] = [];
      
      // Header row - organized format
      rows.push([
        "Nome",
        "CNPJ",
        "Telefone",
        "Email",
        "Situação",
        "Cliente Desde",
        "Valor Mensal Total",
        "Contratos Ativos",
        "Módulos",
        "Onboarding - Etapas",
        "Onboarding - Respostas",
      ]);

      // Data rows
      data?.forEach((client) => {
        const activeContracts = client.contracts?.filter(c => c.status === "active") || [];
        const totalValue = activeContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
        const modules = client.contracts
          ?.flatMap(c => c.contract_modules?.map(cm => cm.service_module?.name) || [])
          .filter(Boolean)
          .join(", ");

        // Format onboarding responses
        const onboardingSteps = client.onboarding_responses
          ?.map(r => r.template_step?.title)
          .filter(Boolean)
          .join("; ");
        
        const onboardingAnswers = client.onboarding_responses
          ?.filter(r => r.response_value)
          .map(r => `${r.template_step?.title}: ${r.response_value}`)
          .join("; ");

        rows.push([
          client.name || "",
          client.cnpj || "",
          client.phone || "",
          client.email || "",
          statusLabels[client.status] || client.status || "",
          client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "",
          totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          String(activeContracts.length),
          modules || "",
          onboardingSteps || "",
          onboardingAnswers || "",
        ]);
      });

      // Convert to CSV string
      const csvContent = rows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      // Download
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToXML = async () => {
    setIsExporting("xml");
    try {
      const data = await fetchFullClientData();

      // Build XML - organized format
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<clientes>\n';

      data?.forEach((client) => {
        xml += '  <cliente>\n';
        
        // Client identification
        xml += '    <identificacao>\n';
        xml += `      <nome>${escapeXml(client.name)}</nome>\n`;
        xml += `      <cnpj>${escapeXml(client.cnpj || "")}</cnpj>\n`;
        xml += `      <telefone>${escapeXml(client.phone || "")}</telefone>\n`;
        xml += `      <email>${escapeXml(client.email || "")}</email>\n`;
        xml += '    </identificacao>\n';
        
        // Status
        xml += '    <situacao>\n';
        xml += `      <status>${escapeXml(statusLabels[client.status] || client.status)}</status>\n`;
        xml += `      <cliente_desde>${client.created_at || ""}</cliente_desde>\n`;
        xml += '    </situacao>\n';
        
        // Contracts
        if (client.contracts && client.contracts.length > 0) {
          xml += '    <contratos>\n';
          client.contracts.forEach((contract) => {
            xml += '      <contrato>\n';
            xml += `        <id>${escapeXml(contract.id)}</id>\n`;
            xml += `        <valor_mensal>${contract.monthly_value}</valor_mensal>\n`;
            xml += `        <data_inicio>${contract.start_date}</data_inicio>\n`;
            xml += `        <data_renovacao>${contract.renewal_date || ""}</data_renovacao>\n`;
            xml += `        <status>${escapeXml(contract.status)}</status>\n`;
            xml += `        <duracao_minima_meses>${contract.minimum_duration_months}</duracao_minima_meses>\n`;
            
            if (contract.contract_modules && contract.contract_modules.length > 0) {
              xml += '        <modulos>\n';
              contract.contract_modules.forEach((cm) => {
                xml += '          <modulo>\n';
                xml += `            <nome>${escapeXml(cm.service_module?.name || "")}</nome>\n`;
                xml += `            <limite_entregas>${cm.deliverable_limit || ""}</limite_entregas>\n`;
                xml += `            <entregas_usadas>${cm.deliverable_used}</entregas_usadas>\n`;
                xml += '          </modulo>\n';
              });
              xml += '        </modulos>\n';
            }
            
            xml += '      </contrato>\n';
          });
          xml += '    </contratos>\n';
        }

        // Onboarding responses
        if (client.onboarding_responses && client.onboarding_responses.length > 0) {
          xml += '    <onboarding>\n';
          client.onboarding_responses.forEach((response) => {
            xml += '      <etapa>\n';
            xml += `        <titulo>${escapeXml(response.template_step?.title || "")}</titulo>\n`;
            xml += `        <resposta>${escapeXml(response.response_value || "")}</resposta>\n`;
            xml += `        <concluido>${response.is_completed ? "Sim" : "Não"}</concluido>\n`;
            xml += `        <data_conclusao>${response.completed_at || ""}</data_conclusao>\n`;
            xml += '      </etapa>\n';
          });
          xml += '    </onboarding>\n';
        }
        
        xml += '  </cliente>\n';
      });

      xml += '</clientes>';

      // Download
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clientes_${new Date().toISOString().split("T")[0]}.xml`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Exportar Dados de Clientes
          </h3>
          <p className="text-sm text-muted-foreground">
            Exporte todos os dados de clientes, contratos, módulos e respostas de onboarding
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                Exportar CSV
              </CardTitle>
              <CardDescription>
                Formato compatível com Excel, Google Sheets e outros programas de planilha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportToCSV} 
                disabled={isExporting !== null}
                className="w-full gap-2"
              >
                {isExporting === "csv" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Baixar CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="h-5 w-5 text-blue-500" />
                Exportar XML
              </CardTitle>
              <CardDescription>
                Formato estruturado para integração com outros sistemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportToXML} 
                disabled={isExporting !== null}
                variant="outline"
                className="w-full gap-2"
              >
                {isExporting === "xml" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Baixar XML
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>{clients.length}</strong> clientes serão incluídos na exportação
          </p>
        </div>
      </div>
    </div>
  );
}
