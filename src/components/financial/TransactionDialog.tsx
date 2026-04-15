import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { format } from "date-fns";
import {
  useCreateTransaction,
  useUpdateTransaction,
  type FinancialTransaction,
  type FinancialCategory,
} from "@/hooks/useFinancialTransactions";
import { useClientContractsWithModules } from "@/hooks/useContracts";
import type { ClientWithContracts } from "@/hooks/useClients";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction | null;
  categories: FinancialCategory[];
  clients: ClientWithContracts[];
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  clients,
}: TransactionDialogProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [contractId, setContractId] = useState<string>("");

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: clientContracts = [] } = useClientContractsWithModules(clientId || null);

  const isEditing = !!transaction;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(Number(transaction.amount));
      setDescription(transaction.description || "");
      setDate(transaction.date);
      setCategoryId(transaction.category_id || "");
      setClientId(transaction.client_id || "");
      setContractId(transaction.contract_id || "");
    } else {
      setType("expense");
      setAmount(0);
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCategoryId("");
      setClientId("");
      setContractId("");
    }
  }, [transaction, open]);

  // When client changes and has a contract, auto-fill amount
  useEffect(() => {
    if (!isEditing && type === "income" && clientId && clientContracts.length > 0) {
      const activeContract = clientContracts.find((c) => c.status === "active");
      if (activeContract) {
        setContractId(activeContract.id);
        if (amount === 0) {
          setAmount(activeContract.monthly_value);
        }
      }
    }
  }, [clientId, clientContracts, type, isEditing]);

  const filteredCategories = categories.filter(
    (c) => c.type === "both" || c.type === type
  );

  const handleSave = async () => {
    if (amount <= 0) return;

    const data = {
      type,
      amount,
      description: description.trim() || undefined,
      date,
      category_id: categoryId || null,
      client_id: clientId || null,
      contract_id: contractId || null,
    };

    if (isEditing && transaction) {
      await updateTransaction.mutateAsync({ id: transaction.id, ...data });
    } else {
      await createTransaction.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className={type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              Entrada
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className={type === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Saída
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor *</Label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <DatePicker value={date} onChange={setDate} placeholder="Selecionar data" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem categoria</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client (for income) */}
          {type === "income" && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setContractId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clients.filter(c => !c.is_internal).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contract (if client selected) */}
          {type === "income" && clientId && clientContracts.length > 0 && (
            <div className="space-y-2">
              <Label>Contrato</Label>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clientContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      R$ {Number(c.monthly_value).toLocaleString("pt-BR")} - {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do lançamento..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || amount <= 0}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
