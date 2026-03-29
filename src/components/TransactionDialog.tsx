import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletNames } from "@/hooks/useWalletNames";

interface Event {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  income_amount: number;
  expense_amount: number;
  category: string;
  cash_type?: string;
  project_id?: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSuccess: () => void;
  targetUserId?: string; // For admin adding transactions for specific users
}

export function TransactionDialog({ 
  open, 
  onOpenChange, 
  transaction, 
  onSuccess,
  targetUserId 
}: TransactionDialogProps) {
  const { getCashWallets } = useWalletNames();
  const cashWallets = getCashWallets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    operation_date: "",
    project_owner: "",
    description: "",
    amount: "",
    operation_type: "expense" as "income" | "expense",
    category: "",
    cash_type: "",
    project_id: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchEvents();
      if (transaction) {
        setForm({
          operation_date: transaction.operation_date,
          project_owner: transaction.project_owner,
          description: transaction.description,
          amount: transaction.income_amount > 0 
            ? transaction.income_amount.toString() 
            : transaction.expense_amount.toString(),
          operation_type: transaction.income_amount > 0 ? "income" : "expense",
          category: transaction.category,
          cash_type: transaction.cash_type || "",
          project_id: transaction.project_id || "",
        });
      } else {
        setForm({
          operation_date: new Date().toISOString().split('T')[0],
          project_owner: "",
          description: "",
          amount: "",
          operation_type: "expense",
          category: "",
          cash_type: "",
          project_id: "",
        });
      }
    }
  }, [open, transaction]);

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .order("name");
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const transactionData = {
        operation_date: form.operation_date,
        project_owner: form.project_owner,
        description: form.description,
        income_amount: form.operation_type === "income" ? parseFloat(form.amount) : 0,
        expense_amount: form.operation_type === "expense" ? parseFloat(form.amount) : 0,
        category: form.category,
        cash_type: form.cash_type || null,
        project_id: form.project_id || null,
        created_by: targetUserId || user.id, // Use targetUserId if provided (admin creating for user)
      };

      let result;
      if (transaction) {
        // Store old data for audit
        const oldData = { ...transaction };
        
        result = await supabase
          .from("financial_transactions")
          .update(transactionData)
          .eq("id", transaction.id);

        // Log audit trail for updates
        if (!result.error) {
          await supabase.from("financial_audit_log").insert({
            transaction_id: transaction.id,
            changed_by: user.id,
            action: "updated",
            old_data: oldData,
            new_data: transactionData,
            change_description: `Updated transaction: ${form.description}`,
          });
        }
      } else {
        result = await supabase
          .from("financial_transactions")
          .insert(transactionData)
          .select()
          .single();

        // Log audit trail for creation
        if (!result.error && result.data) {
          await supabase.from("financial_audit_log").insert({
            transaction_id: result.data.id,
            changed_by: user.id,
            action: "created",
            new_data: transactionData,
            change_description: `Created transaction: ${form.description}`,
          });
        }
      }

      if (result.error) throw result.error;

      toast({
        title: "Успешно!",
        description: transaction ? "Транзакция обновлена" : "Транзакция добавлена",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить транзакцию",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Редактировать транзакцию" : "Добавить транзакцию"}
          </DialogTitle>
          <DialogDescription>
            {transaction ? "Внесите изменения в транзакцию" : "Добавьте новую финансовую транзакцию"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operation_date">Дата операции</Label>
              <Input
                id="operation_date"
                type="date"
                value={form.operation_date}
                onChange={(e) => setForm({ ...form, operation_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operation_type">Тип операции</Label>
              <Select 
                value={form.operation_type} 
                onValueChange={(value: "income" | "expense") => setForm({ ...form, operation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Приход</SelectItem>
                  <SelectItem value="expense">Расход</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_owner">Чей проект</Label>
              <Input
                id="project_owner"
                value={form.project_owner}
                onChange={(e) => setForm({ ...form, project_owner: e.target.value })}
                placeholder="Имя владельца проекта"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Проект</Label>
              <Select 
                value={form.project_id} 
                onValueChange={(value) => setForm({ ...form, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите проект (опционально)" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Подробное описание</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Опишите транзакцию подробно"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма (₽)</Label>
              <CurrencyInput
                value={parseFloat(form.amount) || undefined}
                onChange={(value) => setForm({ ...form, amount: value?.toString() || "" })}
                placeholder="Введите сумму"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash_type">Тип наличных</Label>
              <Select 
                value={form.cash_type} 
                onValueChange={(value) => setForm({ ...form, cash_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип наличных" />
                </SelectTrigger>
                <SelectContent>
                  {cashWallets.map(w => (
                    <SelectItem key={w.key} value={w.key}>{w.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Статья {form.operation_type === "income" ? "прихода" : "расхода"}</Label>
            <Select 
              value={form.category} 
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="catering">Кейтеринг</SelectItem>
                <SelectItem value="venue">Аренда площадки</SelectItem>
                <SelectItem value="equipment">Оборудование</SelectItem>
                <SelectItem value="decoration">Декор</SelectItem>
                <SelectItem value="staff">Персонал</SelectItem>
                <SelectItem value="marketing">Маркетинг</SelectItem>
                <SelectItem value="transport">Транспорт</SelectItem>
                <SelectItem value="materials">Материалы</SelectItem>
                <SelectItem value="services">Услуги</SelectItem>
                <SelectItem value="other">Прочее</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение..." : transaction ? "Сохранить изменения" : "Добавить транзакцию"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}