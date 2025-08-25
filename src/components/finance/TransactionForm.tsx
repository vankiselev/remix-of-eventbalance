import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const transactionSchema = z.object({
  operation_date: z.string().min(1, "Дата обязательна"),
  project_owner: z.string().min(1, "Владелец проекта обязателен"),
  description: z.string().min(1, "Описание обязательно"),
  category: z.string().min(1, "Категория обязательна"),
  cash_type: z.string().optional(),
  amount: z.string().min(1, "Сумма обязательна"),
  transaction_type: z.enum(["income", "expense"]),
  project_id: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Event {
  id: string;
  name: string;
}

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTransaction?: any;
}

export function TransactionForm({ 
  isOpen, 
  onOpenChange, 
  onSuccess, 
  editTransaction 
}: TransactionFormProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: "",
      project_owner: "",
      description: "",
      category: "",
      cash_type: "",
      amount: "",
      transaction_type: "expense",
      project_id: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      if (editTransaction) {
        // Populate form with edit data
        form.reset({
          operation_date: editTransaction.operation_date,
          project_owner: editTransaction.project_owner,
          description: editTransaction.description,
          category: editTransaction.category,
          cash_type: editTransaction.cash_type || "",
          amount: String(editTransaction.income_amount || editTransaction.expense_amount || ""),
          transaction_type: editTransaction.income_amount ? "income" : "expense",
          project_id: editTransaction.project_id || "",
          notes: editTransaction.notes || "",
        });
      } else {
        form.reset({
          operation_date: new Date().toISOString().split('T')[0],
          project_owner: "",
          description: "",
          category: "",
          cash_type: "",
          amount: "",
          transaction_type: "expense",
          project_id: "",
          notes: "",
        });
      }
    }
  }, [isOpen, editTransaction, form]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      const amount = parseFloat(data.amount);
      const transactionData = {
        operation_date: data.operation_date,
        project_owner: data.project_owner,
        description: data.description,
        category: data.category,
        cash_type: data.cash_type || null,
        income_amount: data.transaction_type === "income" ? amount : null,
        expense_amount: data.transaction_type === "expense" ? amount : null,
        project_id: data.project_id || null,
        notes: data.notes || null,
        created_by: user.id,
      };

      if (editTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("financial_transactions")
          .update(transactionData)
          .eq("id", editTransaction.id);

        if (error) throw error;

        // Log audit trail
        await supabase.from("financial_audit_log").insert({
          transaction_id: editTransaction.id,
          changed_by: user.id,
          action: "updated",
          old_data: editTransaction,
          new_data: transactionData,
          change_description: `Транзакция обновлена: ${data.description}`,
        });

        toast({
          title: "Успешно",
          description: "Транзакция обновлена",
        });
      } else {
        // Create new transaction
        const { data: newTransaction, error } = await supabase
          .from("financial_transactions")
          .insert(transactionData)
          .select()
          .single();

        if (error) throw error;

        // Log audit trail
        await supabase.from("financial_audit_log").insert({
          transaction_id: newTransaction.id,
          changed_by: user.id,
          action: "created",
          new_data: transactionData,
          change_description: `Транзакция создана: ${data.description}`,
        });

        toast({
          title: "Успешно",
          description: "Транзакция добавлена",
        });
      }

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
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTransaction ? "Редактировать транзакцию" : "Добавить транзакцию"}
          </DialogTitle>
          <DialogDescription>
            {editTransaction 
              ? "Внесите изменения в транзакцию" 
              : "Заполните форму для добавления новой финансовой транзакции"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="operation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата операции</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип операции</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Расход</SelectItem>
                        <SelectItem value="income">Доход</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Чей проект</FormLabel>
                    <FormControl>
                      <Input placeholder="Владелец проекта" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подробное описание</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Опишите транзакцию..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма (₽)</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value ? Number(field.value) : undefined}
                          onChange={(value) => field.onChange(value?.toString() || "")}
                          placeholder="0.00"
                        />
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cash_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Касса</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите кассу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nastya">Настя</SelectItem>
                        <SelectItem value="lera">Лера</SelectItem>
                        <SelectItem value="vanya">Ваня</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статья прихода/расхода</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="catering">Кейтеринг</SelectItem>
                      <SelectItem value="venue">Аренда площадки</SelectItem>
                      <SelectItem value="equipment">Оборудование</SelectItem>
                      <SelectItem value="decoration">Декор</SelectItem>
                      <SelectItem value="staff">Персонал</SelectItem>
                      <SelectItem value="marketing">Маркетинг</SelectItem>
                      <SelectItem value="transport">Транспорт</SelectItem>
                      <SelectItem value="materials">Материалы</SelectItem>
                      <SelectItem value="client_payment">Оплата клиента</SelectItem>
                      <SelectItem value="partner_payment">Оплата партнёра</SelectItem>
                      <SelectItem value="refund">Возврат</SelectItem>
                      <SelectItem value="other">Прочее</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дополнительные заметки</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Дополнительная информация..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? "Сохранение..." 
                  : editTransaction 
                    ? "Обновить" 
                    : "Добавить"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}