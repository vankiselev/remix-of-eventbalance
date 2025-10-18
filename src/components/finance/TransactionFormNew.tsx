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
import { CurrencyInput } from "@/components/ui/currency-input";
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/dateFormat';
import { PROJECT_OWNERS, EXPENSE_INCOME_CATEGORIES, STATIC_PROJECTS } from '@/utils/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

// Create schema without strict no_receipt_reason validation
// We'll validate it separately based on user role
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
  const hasExpense = data.expense_amount !== undefined && data.expense_amount !== null && data.expense_amount !== 0;
  const hasIncome = data.income_amount !== undefined && data.income_amount !== null && data.income_amount !== 0;
  
  if (!hasExpense && !hasIncome) {
    return false;
  }
  
  if (hasExpense && hasIncome) {
    return false;
  }
  
  return true;
}, {
  message: "Заполните либо сумму траты, либо сумму прихода (только одно поле). Можно использовать отрицательные значения.",
  path: ["expense_amount"],
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
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMoneyTransfer, setIsMoneyTransfer] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: profile } = await supabase
        .rpc("get_user_basic_profile")
        .single();
      setIsAdmin(profile?.role === "admin");
    };
    checkUserRole();
  }, []);

  // Load employees for money transfer
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('employment_status', 'active')
        .neq('id', currentUser.user.id)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

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
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // Reset form when dialog opens/closes or editTransaction changes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        // Check if the project is a static one or an event ID
        // If we have a static_project_name, use that, otherwise use project_id
        const projectValue = editTransaction.static_project_name || editTransaction.project_id;
        
        form.reset({
          operation_date: new Date(editTransaction.operation_date),
          project_id: projectValue || undefined,
          whose_project: editTransaction.project_owner || undefined,
          description: editTransaction.description,
          expense_amount: editTransaction.expense_amount || undefined,
          income_amount: editTransaction.income_amount || undefined,
          category: editTransaction.category || undefined,
          no_receipt: editTransaction.no_receipt || false,
          no_receipt_reason: editTransaction.no_receipt_reason || "",
        });
        setFiles([]);
      } else {
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
      }
    }
  }, [isOpen, editTransaction, form]);

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

  const onSubmit = async (data: TransactionFormData) => {
    if (submitting) return;

    // Validate money transfer
    if (isMoneyTransfer) {
      if (!transferToUserId) {
        toast({
          title: "Ошибка",
          description: "Выберите получателя денег",
          variant: "destructive",
        });
        return;
      }

      if (!data.expense_amount || data.expense_amount <= 0) {
        toast({
          title: "Ошибка",
          description: "Укажите сумму передачи (должна быть больше 0)",
          variant: "destructive",
        });
        return;
      }

      if (data.income_amount) {
        toast({
          title: "Ошибка",
          description: "При передаче денег заполняйте только поле 'Трата'",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate no_receipt_reason for regular users
    if (!isAdmin && data.no_receipt && (!data.no_receipt_reason || data.no_receipt_reason.trim().length < 10)) {
      toast({
        title: "Ошибка",
        description: "При отсутствии чека необходимо указать причину (минимум 10 символов)",
        variant: "destructive",
      });
      return;
    }

    // Validate files and no_receipt logic
    // For regular users, require files OR no_receipt with reason
    // For money transfers, files are optional
    if (!isAdmin && !isMoneyTransfer) {
      if (!data.no_receipt && files.length === 0) {
        toast({
          title: "Ошибка",
          description: "Загрузите чек или отметьте 'Чека нет' с указанием причины",
          variant: "destructive",
        });
        return;
      }
    }
    
    // For admins, just check that files and no_receipt are not both set
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!user) throw new Error('User not authenticated');

      // Handle project_id - if it's a static project (string), store it in static_project_name, otherwise it's an event ID
      const projectId = data.project_id;
      const isStaticProject = projectId && STATIC_PROJECTS.includes(projectId);
      
      const transactionData = {
        operation_date: data.operation_date.toISOString().split('T')[0],
        project_id: isStaticProject ? null : (projectId || null), // Only store UUID for events, null for static projects
        static_project_name: isStaticProject ? projectId : null, // Store static project name
        project_owner: data.whose_project,
        description: data.description,
        expense_amount: data.expense_amount || 0,
        income_amount: data.income_amount || 0,
        cash_type: data.whose_project,
        category: data.category,
        no_receipt: data.no_receipt,
        no_receipt_reason: data.no_receipt ? data.no_receipt_reason : null,
        created_by: user.id,
        // Money transfer fields
        transfer_to_user_id: isMoneyTransfer ? transferToUserId : null,
        transfer_status: isMoneyTransfer ? 'pending' : null,
      };

      let transactionResult;
      
      if (editTransaction) {
        // Update existing transaction
        const { data: transaction, error } = await supabase
          .from('financial_transactions')
          .update(transactionData)
          .eq('id', editTransaction.id)
          .select()
          .single();

        if (error) throw error;
        transactionResult = transaction;

        // Log audit entry for update
        await supabase
          .from('financial_audit_log')
          .insert([{
            transaction_id: editTransaction.id,
            action: 'UPDATE',
            changed_by: user.id,
            old_data: editTransaction,
            new_data: transactionData,
            change_description: 'Transaction updated'
          }]);
      } else {
        // Create new transaction
        const { data: transaction, error } = await supabase
          .from('financial_transactions')
          .insert([transactionData])
          .select()
          .single();

        if (error) throw error;
        transactionResult = transaction;

        // Log audit entry for create
        await supabase
          .from('financial_audit_log')
          .insert([{
            transaction_id: transaction.id,
            action: 'CREATE',
            changed_by: user.id,
            new_data: transactionData,
            change_description: 'Transaction created'
          }]);

        // If this is a money transfer, send notification to recipient
        if (isMoneyTransfer && transferToUserId) {
          console.log('💸 Sending money transfer notification...', {
            transactionId: transaction.id,
            recipientId: transferToUserId,
          });

          const { data: notifyResult, error: notifyError } = await supabase.functions.invoke('handle-money-transfer', {
            body: {
              transaction_id: transaction.id,
              action: 'notify',
            },
          });

          if (notifyError) {
            console.error('❌ Failed to send transfer notification:', notifyError);
            toast({
              title: "Предупреждение",
              description: "Транзакция создана, но не удалось отправить уведомление получателю",
              variant: "destructive",
            });
          } else {
            console.log('✅ Money transfer notification sent successfully:', notifyResult);
          }
        }

        // Send notification to admins for large transactions (over 10000)
        const amount = data.expense_amount || data.income_amount || 0;
        if (amount >= 10000 && !isMoneyTransfer) {
          const { sendNotificationToAdmins } = await import('@/utils/notifications');
          const type = data.expense_amount ? 'расход' : 'приход';
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          await sendNotificationToAdmins(
            'Крупная транзакция',
            `${profile?.full_name || 'Сотрудник'} внес ${type} ${amount.toLocaleString('ru-RU')} ₽ (${data.category})`,
            'transaction',
            { 
              amount,
              category: data.category,
              description: data.description
            }
          );
        }
      }

      // Upload files if any
      if (files.length > 0) {
        await uploadFiles(transactionResult.id, user.id);
      }

      toast({
        title: "Успех",
        description: editTransaction ? "Транзакция обновлена" : "Операция сохранена",
      });

      form.reset();
      setFiles([]);
      onOpenChange(false);
      onSuccess?.();
      } catch (error) {
      console.error('Error saving transaction:', error);
      const err = error as any;
      toast({
        title: "Ошибка",
        description: err?.message || err?.error?.message || err?.details || JSON.stringify(err),
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

      if (dbError) {
        console.error('DB Error for attachment:', dbError);
        throw dbError;
      }
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
              render={({ field }) => {
                const filteredStaticProjects = STATIC_PROJECTS.filter(project =>
                  project.toLowerCase().includes(projectSearch.toLowerCase())
                );
                const filteredEvents = events.filter(event =>
                  event.name.toLowerCase().includes(projectSearch.toLowerCase())
                );

                return (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Поиск проекта..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredStaticProjects.map((project) => (
                          <SelectItem key={`static-${project}`} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                        {filteredStaticProjects.length > 0 && filteredEvents.length > 0 && (
                          <div className="mx-2 my-1 border-t border-border" />
                        )}
                        {filteredEvents.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
                      {PROJECT_OWNERS.map((option) => (
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
                      placeholder={
                        form.watch("category") === "Передано или получено от сотрудника"
                          ? "Например: Передал на наличные расходы по проекту"
                          : "Опишите операцию..."
                      }
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
                    <FormLabel>
                      Сумма Траты (₽)
                      {form.watch("category") === "Передано или получено от сотрудника" && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          ← Заполните это поле
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          if (value !== undefined && value !== null && value !== 0) {
                            form.setValue("income_amount", undefined);
                          }
                        }}
                        placeholder={
                          form.watch("category") === "Передано или получено от сотрудника"
                            ? "Сумма передачи сотруднику"
                            : "Введите сумму (можно отрицательную)"
                        }
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
                          if (value !== undefined && value !== null && value !== 0) {
                            form.setValue("expense_amount", undefined);
                          }
                        }}
                        placeholder="Введите сумму (можно отрицательную)"
                        disabled={form.watch("category") === "Передано или получено от сотрудника"}
                      />
                    </FormControl>
                    {form.watch("category") === "Передано или получено от сотрудника" && (
                      <FormDescription className="text-xs">
                        При передаче денег не заполняется
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => {
                const filteredCategories = EXPENSE_INCOME_CATEGORIES.filter(category =>
                  category.toLowerCase().includes(categorySearch.toLowerCase())
                );

                return (
                  <FormItem>
                    <FormLabel>Статья прихода/расхода</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Automatically enable money transfer for employee transfer category
                        if (value === 'Передано или получено от сотрудника') {
                          setIsMoneyTransfer(true);
                          // Auto-set no_receipt for money transfers
                          form.setValue('no_receipt', true);
                          form.setValue('no_receipt_reason', 'Внутренняя передача денег между сотрудниками');
                          // Clear income amount for money transfers
                          form.setValue('income_amount', undefined);
                        } else {
                          setIsMoneyTransfer(false);
                          setTransferToUserId("");
                          // Reset no_receipt when switching away
                          form.setValue('no_receipt', false);
                          form.setValue('no_receipt_reason', '');
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Поиск категории..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredCategories.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Money Transfer Section */}
            {form.watch("category") === "Передано или получено от сотрудника" && (
              <div className="space-y-4 p-4 border-2 rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💸</span>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-semibold text-primary">Передача денег сотруднику</h3>
                    <p className="text-xs text-muted-foreground">
                      Выберите сотрудника, который получит деньги. Он получит уведомление и должен будет подтвердить получение.
                      <br />
                      <strong>Важно:</strong> Заполняйте только поле "Сумма Траты".
                    </p>
                  </div>
                </div>

                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Кому передаются деньги <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select 
                    value={transferToUserId} 
                    onValueChange={setTransferToUserId}
                  >
                    <FormControl>
                      <SelectTrigger className="border-primary/30">
                        <SelectValue placeholder="Выберите получателя из списка..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Нет доступных сотрудников
                        </div>
                      ) : (
                        employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name} ({employee.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {transferToUserId && (
                    <FormDescription className="text-xs text-primary">
                      ✓ Получатель будет уведомлен сразу после сохранения
                    </FormDescription>
                  )}
                </FormItem>
              </div>
            )}

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
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? "Сохранение..." : editTransaction ? "Обновить" : "Сохранить операцию"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}