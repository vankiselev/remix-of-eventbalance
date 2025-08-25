import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload, UploadedFile } from './FileUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
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

const transactionSchema = z.object({
  operation_date: z.date({
    required_error: "Дата операции обязательна",
  }),
  type: z.enum(["expense", "income"], {
    required_error: "Выберите тип операции",
  }),
  project_id: z.string().optional(),
  description: z.string().min(1, "Описание обязательно"),
  amount: z.number().positive("Сумма должна быть положительной"),
  cash_type: z.string().min(1, "Выберите тип наличных"),
  category: z.string().min(1, "Категория обязательна"),
  no_receipt: z.boolean().default(false),
  no_receipt_reason: z.string().optional(),
}).refine((data) => {
  if (data.no_receipt && (!data.no_receipt_reason || data.no_receipt_reason.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "При отсутствии чека необходимо указать причину (минимум 10 символов)",
  path: ["no_receipt_reason"],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Event {
  id: string;
  name: string;
}

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editTransaction?: any;
}

export function TransactionForm({ isOpen, onOpenChange, onSuccess, editTransaction }: TransactionFormProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: new Date(),
      type: "expense",
      project_id: "",
      description: "",
      amount: 0,
      cash_type: "",
      category: "",
      no_receipt: editTransaction?.no_receipt || false,
      no_receipt_reason: editTransaction?.no_receipt_reason || "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // Reset form when dialog opens/closes or editTransaction changes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        form.reset({
          operation_date: new Date(editTransaction.operation_date),
          type: editTransaction.expense_amount > 0 ? "expense" : "income",
          project_id: editTransaction.project_id || "",
          description: editTransaction.description,
          amount: editTransaction.expense_amount || editTransaction.income_amount || 0,
          cash_type: editTransaction.cash_type || "",
          category: editTransaction.category || "",
          no_receipt: editTransaction.no_receipt || false,
          no_receipt_reason: editTransaction.no_receipt_reason || "",
        });
      } else {
        form.reset();
        setFiles([]);
      }
    }
  }, [isOpen, editTransaction, form]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Пользователь не авторизован",
          variant: "destructive",
        });
        return;
      }

      const transactionData = {
        operation_date: data.operation_date.toISOString().split('T')[0],
        project_id: data.project_id || null,
        description: data.description,
        project_owner: "", // This could be derived from project or user
        expense_amount: data.type === "expense" ? data.amount : 0,
        income_amount: data.type === "income" ? data.amount : 0,
        cash_type: data.cash_type,
        category: data.category,
        no_receipt: data.no_receipt,
        no_receipt_reason: data.no_receipt_reason || null,
        created_by: user.id,
      };

      let result;
      if (editTransaction) {
        result = await supabase
          .from("financial_transactions")
          .update(transactionData)
          .eq("id", editTransaction.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("financial_transactions")
          .insert([transactionData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Upload files if any
      if (files.length > 0 && result.data) {
        await uploadFiles(result.data.id, user.id);
      }

      // Log to audit trail
      if (result.data) {
        await supabase.from("financial_audit_log").insert([
          {
            transaction_id: result.data.id,
            action: editTransaction ? "update" : "create",
            changed_by: user.id,
            new_data: result.data,
            old_data: editTransaction || null,
            change_description: editTransaction 
              ? `Транзакция обновлена: ${data.description}` 
              : `Новая транзакция: ${data.description}`,
          },
        ]);
      }

      toast({
        title: "Успешно",
        description: editTransaction 
          ? "Транзакция обновлена" 
          : "Транзакция добавлена",
      });

      form.reset();
      setFiles([]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить транзакцию",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (transactionId: string, userId: string) => {
    const uploadPromises = files.map(async (fileItem) => {
      const fileExtension = fileItem.file.name.split('.').pop() || '';
      const fileName = `${fileItem.id}.${fileExtension}`;
      const storagePath = `transactions/${userId}/${transactionId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, fileItem.file);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('financial_attachments')
        .insert([
          {
            transaction_id: transactionId,
            storage_path: storagePath,
            original_filename: fileItem.file.name,
            mime_type: fileItem.file.type,
            size_bytes: fileItem.file.size,
            created_by: userId,
          },
        ]);

      if (dbError) throw dbError;
    });

    await Promise.all(uploadPromises);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTransaction ? "Редактировать транзакцию" : "Внести трату/приход"}
          </DialogTitle>
          <DialogDescription>
            {editTransaction 
              ? "Внесите изменения в транзакцию" 
              : "Заполните форму для добавления новой финансовой транзакции"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="operation_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата операции</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy")
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип операции</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подробное описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Опишите транзакцию подробно..." 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сумма (₽)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Receipt Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Чек / вложения</h3>
              
              <FormField
                control={form.control}
                name="no_receipt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Чека нет
                      </FormLabel>
                      <FormDescription>
                        Включите если у вас нет чека для этой транзакции
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("no_receipt") ? (
                <FormField
                  control={form.control}
                  name="no_receipt_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Причина отсутствия чека *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Укажите причину отсутствия чека (минимум 10 символов)..."
                          className="min-h-[80px]"
                          {...field}
                          autoFocus
                        />
                      </FormControl>
                      <FormDescription>
                        Обязательно укажите причину отсутствия чека
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Загрузить файлы
                  </label>
                  <FileUpload
                    files={files}
                    onFilesChange={setFiles}
                    maxFiles={5}
                    maxSize={10}
                    disabled={submitting}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Сохранение..." : editTransaction ? "Обновить" : "Добавить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}