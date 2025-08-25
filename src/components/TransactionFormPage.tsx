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
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload, UploadedFile } from './finance/FileUpload';
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/dateFormat';
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
  project_id: z.string().optional(),
  whose_project: z.string().min(1, "Выберите чей проект"),
  description: z.string().min(1, "Описание обязательно"),
  expense_amount: z.number().optional(),
  income_amount: z.number().optional(),
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
}).refine((data) => {
  const hasExpense = data.expense_amount && data.expense_amount > 0;
  const hasIncome = data.income_amount && data.income_amount > 0;
  
  if (!hasExpense && !hasIncome) {
    return false;
  }
  
  if (hasExpense && hasIncome) {
    return false;
  }
  
  return true;
}, {
  message: "Заполните либо сумму траты, либо сумму прихода (только одно поле)",
  path: ["expense_amount"],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Event {
  id: string;
  name: string;
}

interface TransactionFormPageProps {
  onNavigateToFinances: () => void;
}

export function TransactionFormPage({ onNavigateToFinances }: TransactionFormPageProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: new Date(),
      project_id: undefined,
      whose_project: undefined,
      description: "",
      expense_amount: undefined,
      income_amount: undefined,
      category: undefined,
      no_receipt: false,
      no_receipt_reason: "",
    },
  });

  const watchNoReceipt = form.watch("no_receipt");

  useEffect(() => {
    if (watchNoReceipt && files.length === 0) {
      // Auto-focus on reason field when "no receipt" is checked and no files
      const reasonField = document.querySelector('textarea[name="no_receipt_reason"]') as HTMLTextAreaElement;
      if (reasonField) {
        reasonField.focus();
      }
    }
  }, [watchNoReceipt, files.length]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить список проектов",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [toast]);

  const resetForm = () => {
    form.reset({
      operation_date: new Date(),
      project_id: undefined,
      whose_project: undefined,
      description: "",
      expense_amount: undefined,
      income_amount: undefined,
      category: undefined,
      no_receipt: false,
      no_receipt_reason: "",
    });
    setFiles([]);
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (submitting) return;

    // Validate files and no_receipt logic
    if (!data.no_receipt && files.length === 0) {
      toast({
        title: "Ошибка",
        description: "Загрузите чек или отметьте 'Чека нет' с указанием причины",
        variant: "destructive",
      });
      return;
    }

    if (data.no_receipt && files.length > 0) {
      toast({
        title: "Ошибка", 
        description: "Нельзя одновременно прикрепить файлы и отметить 'Чека нет'",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const transactionData = {
        operation_date: data.operation_date.toISOString().split('T')[0],
        project_id: data.project_id || null,
        project_owner: data.whose_project,
        description: data.description,
        expense_amount: data.expense_amount || 0,
        income_amount: data.income_amount || 0,
        cash_type: data.whose_project,
        category: data.category,
        no_receipt: data.no_receipt,
        no_receipt_reason: data.no_receipt ? data.no_receipt_reason : null,
        created_by: user.id,
      };

      const { data: transaction, error } = await supabase
        .from('financial_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      // Upload files if any
      if (files.length > 0) {
        await uploadFiles(transaction.id, user.id);
      }

      // Log audit entry
      await supabase
        .from('financial_audit_log')
        .insert([{
          transaction_id: transaction.id,
          action: 'CREATE',
          changed_by: user.id,
          new_data: transactionData,
          change_description: 'Transaction created'
        }]);

      toast({
        title: "Успех",
        description: "Операция сохранена",
      });

      resetForm();
      onNavigateToFinances();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сохранить операцию",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (transactionId: string, userId: string) => {
    const uploadPromises = files.map(async (fileItem) => {
      const fileExtension = fileItem.file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const storagePath = `receipts/${transactionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, fileItem.file);

      if (uploadError) throw uploadError;

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

  const categories = [
    "Реквизит",
    "Транспорт", 
    "Питание",
    "Материалы",
    "Услуги",
    "Аренда",
    "Зарплата",
    "Другое"
  ];

  const whoseProjectOptions = [
    "Наличка Настя",
    "Наличка Лера", 
    "Наличка Ваня",
    "Корп. карта Настя",
    "Корп. карта Лера",
    "ИП Настя",
    "ИП Лера",
    "Оплатил(а) клиент",
    "Оплатила Настя",
    "Оплатила Лера",
    "Получила Лера",
    "Получила Настя"
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onNavigateToFinances}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к финансам
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Внести трату/приход</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
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
                                   formatDate(field.value)
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
                </div>

                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Проект (необязательно)</FormLabel>
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
                  name="whose_project"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Чей проект</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {whoseProjectOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подробное описание</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Опишите операцию..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expense_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сумма Траты (₽)</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              if (value && value > 0) {
                                form.setValue("income_amount", undefined);
                              }
                            }}
                            placeholder="Введите сумму"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="income_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сумма Прихода (₽)</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              if (value && value > 0) {
                                form.setValue("expense_amount", undefined);
                              }
                            }}
                            placeholder="Введите сумму"
                          />
                        </FormControl>
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
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormLabel>Чек / вложения</FormLabel>
                  
                  <FileUpload
                    files={files}
                    onFilesChange={setFiles}
                    maxFiles={5}
                    maxSize={10} // 10MB
                  />

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="no_receipt"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Чека нет
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchNoReceipt && (
                    <FormField
                      control={form.control}
                      name="no_receipt_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Причина отсутствия чека *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Укажите причину отсутствия чека (минимум 10 символов)..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Минимум 10 символов
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline" 
                    onClick={onNavigateToFinances}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? "Сохранение..." : "Сохранить операцию"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}