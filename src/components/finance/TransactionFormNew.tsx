// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, AlertCircle, Check, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload, UploadedFile } from './FileUpload';
import { CurrencyInput } from "@/components/ui/currency-input";
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/dateFormat';
import { PROJECT_OWNERS, STATIC_PROJECTS } from '@/utils/constants';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { declineFullNameToDative, detectGender } from '@/utils/nameDeclenation';
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useDescriptionChecker } from "@/hooks/useDescriptionChecker";
import { useTransactionSuggestions } from "@/hooks/useTransactionSuggestions";
import { useTenant } from "@/contexts/TenantContext";
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
  project_owner?: string | null;
}

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editTransaction?: any;
  inline?: boolean; // Если true, форма отображается без Dialog
}

export function TransactionForm({ isOpen, onOpenChange, onSuccess, editTransaction, inline = false }: TransactionFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAdmin } = useUserRbacRoles();
  const { currentTenant } = useTenant();
  const { categories: transactionCategories } = useTransactionCategories();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isMoneyTransfer, setIsMoneyTransfer] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);
  const [categorySelectOpen, setCategorySelectOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name: string } | null>(null);
  const submitLockRef = useRef(false);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const projectSearchInputRef = useRef<HTMLInputElement>(null);
  const [whoseProjectSearch, setWhoseProjectSearch] = useState("");
  const [whoseProjectSelectOpen, setWhoseProjectSelectOpen] = useState(false);
  const whoseProjectSearchInputRef = useRef<HTMLInputElement>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isWhoseProjectAutoFilled, setIsWhoseProjectAutoFilled] = useState(false);
  const [isDescriptionAutoFilled, setIsDescriptionAutoFilled] = useState(false);

  // Load employees for money transfer and current user profile
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadCurrentUserProfile();
    }
  }, [isOpen, currentTenant?.id]);

  const loadEmployees = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        console.warn('❌ loadEmployees: no current user');
        return;
      }

      const myAuthId = currentUser.user.id;
      let employeeList: Array<{ id: string; full_name: string; email: string }> = [];

      // Strategy 1: Try tenant_memberships to get auth UIDs of co-workers
      let recipientAuthIds: string[] = [];
      try {
        let membershipsQuery: any = supabase
          .from('tenant_memberships')
          .select('tenant_id, user_id');

        if (currentTenant?.id) {
          membershipsQuery = membershipsQuery.eq('tenant_id', currentTenant.id);
        }

        const { data: memberships, error: membershipsError } = await membershipsQuery;

        if (membershipsError) {
          console.warn('⚠️ tenant_memberships query failed:', membershipsError.message);
        } else {
          const rows = memberships || [];
          console.log('📋 tenant_memberships rows:', rows.length);

          if (currentTenant?.id) {
            recipientAuthIds = rows
              .filter((m: any) => m.user_id && m.user_id !== myAuthId)
              .map((m: any) => m.user_id);
          } else {
            const myTenantIds = new Set(
              rows
                .filter((m: any) => m.user_id === myAuthId)
                .map((m: any) => m.tenant_id)
                .filter(Boolean)
            );
            recipientAuthIds = rows
              .filter((m: any) => m.user_id && m.user_id !== myAuthId && myTenantIds.has(m.tenant_id))
              .map((m: any) => m.user_id);
          }
          recipientAuthIds = [...new Set(recipientAuthIds)];
          console.log('🔑 recipientAuthIds from memberships:', recipientAuthIds.length);
        }
      } catch (e) {
        console.warn('⚠️ memberships strategy failed:', e);
      }

      // Strategy 2: If memberships gave us IDs, resolve profiles
      if (recipientAuthIds.length > 0) {
        const profileMap = new Map<string, { full_name: string; email: string }>();

        // Try profiles.user_id first (self-hosted), then profiles.id (Cloud)
        try {
          const { data: profilesByUserId, error: err1 } = await (supabase
            .from('profiles') as any)
            .select('id, user_id, full_name, email')
            .in('user_id', recipientAuthIds);

          if (err1) throw err1;
          (profilesByUserId || []).forEach((p: any) => {
            if (p.user_id) {
              profileMap.set(p.user_id, {
                full_name: p.full_name || 'Сотрудник',
                email: p.email || '',
              });
            }
          });
          console.log('✅ Resolved via profiles.user_id:', profileMap.size);
        } catch {
          const { data: profilesById } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', recipientAuthIds);

          (profilesById || []).forEach((p: any) => {
            profileMap.set(p.id, {
              full_name: p.full_name || 'Сотрудник',
              email: p.email || '',
            });
          });
          console.log('✅ Resolved via profiles.id:', profileMap.size);
        }

        employeeList = recipientAuthIds
          .map((authId) => {
            const profile = profileMap.get(authId);
            return {
              id: authId,
              full_name: profile?.full_name || 'Сотрудник',
              email: profile?.email || '',
            };
          })
          .filter(e => e.full_name !== 'Сотрудник' || e.email)
          .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
      }

      // Strategy 3: Fallback — load all profiles except current user
      if (employeeList.length === 0) {
        console.log('⚠️ No employees from memberships, falling back to all profiles');
        const { data: allProfiles, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .neq('id', myAuthId)
          .order('full_name');

        if (fallbackError) {
          console.error('❌ Fallback profiles query failed:', fallbackError);
        } else {
          // On self-hosted, profiles.id might not be auth uid
          // Try also excluding by user_id column
          let filteredProfiles = allProfiles || [];
          
          // Also try to get profiles that have user_id != current user
          try {
            const { data: profilesWithUserId } = await (supabase
              .from('profiles') as any)
              .select('id, user_id, full_name, email')
              .neq('user_id', myAuthId)
              .order('full_name');
            
            if (profilesWithUserId && profilesWithUserId.length > 0) {
              filteredProfiles = profilesWithUserId;
              console.log('✅ Fallback using user_id filter:', filteredProfiles.length);
            }
          } catch {
            console.log('ℹ️ No user_id column, using id filter');
          }

          employeeList = filteredProfiles.map((p: any) => ({
            id: p.user_id || p.id,
            full_name: p.full_name || 'Сотрудник',
            email: p.email || '',
          }));
        }
      }

      console.log('👥 Final employee list:', employeeList.length, employeeList.map((e) => ({ id: e.id, name: e.full_name })));
      setEmployees(employeeList);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
    }
  };

  const loadCurrentUserProfile = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Try user_id first (self-hosted DB), fall back to id
      let profile = null;
      const { data: data1 } = await (supabase
        .from('profiles') as any)
        .select('full_name')
        .eq('user_id', currentUser.user.id)
        .maybeSingle();
      
      if (data1) {
        profile = data1;
      } else {
        const { data: data2 } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUser.user.id)
          .maybeSingle();
        profile = data2;
      }
      
      setCurrentUserProfile(profile);
    } catch (error) {
      console.error('Error loading current user profile:', error);
    }
  };

  const mapProjectOwnerToCashType = (owner: string | null): string | undefined => {
    if (!owner) return undefined;
    
    const mapping: Record<string, string> = {
      'Настя': 'Наличка Настя',
      'Лера': 'Наличка Лера',
      'Ваня': 'Наличка Ваня'
    };
    
    return mapping[owner];
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
  const watchProjectId = form.watch("project_id");
  const watchCategory = form.watch("category");
  const watchDescription = form.watch("description");

  // AI-powered description checker
  const {
    isChecking,
    hasErrors,
    correctedText,
    errors,
    suppressNextCheck,
    clearCorrection,
  } = useDescriptionChecker(watchDescription, watchCategory);

  // AI-powered transaction suggestions
  const {
    suggestions: aiSuggestions,
    isAnalyzing,
    confidence: aiConfidence,
    applySuggestions: applyAISuggestions,
    dismissSuggestions,
    suppressNextAnalysis,
  } = useTransactionSuggestions(watchDescription, (suggestions) => {
    // Apply AI suggestions to form
    if (suggestions.category) {
      form.setValue('category', suggestions.category);
      
      // Handle special categories
      if (suggestions.category === 'Передано или получено от сотрудника') {
        setIsMoneyTransfer(true);
        form.setValue('no_receipt', true);
        form.setValue('no_receipt_reason', 'Внутренняя передача денег между сотрудниками');
        form.setValue('income_amount', undefined);
      }
    }
    
    if (suggestions.project) {
      form.setValue('project_id', suggestions.project);
    }

    toast({
      title: "Применены предложения AI",
      description: "Категория и проект заполнены автоматически",
      duration: 3000,
    });
  });

  // Apply correction without triggering re-analysis
  const handleApplyCorrection = () => {
    if (!correctedText) return;
    suppressNextCheck();
    suppressNextAnalysis();
    form.setValue("description", correctedText);
    clearCorrection();
    toast({
      title: "Исправление применено",
      description: "Описание обновлено",
    });
  };

  // Apply all AI suggestions at once
  const handleApplyAll = () => {
    if (hasErrors && correctedText) {
      suppressNextCheck();
      suppressNextAnalysis();
      form.setValue("description", correctedText);
      clearCorrection();
    }
    if (aiSuggestions && aiConfidence > 0.6) {
      applyAISuggestions();
    }
    toast({
      title: "Все предложения применены",
      description: "Описание, категория и проект обновлены",
      duration: 3000,
    });
  };

  // Money transfer categories that require employee selection
  const MONEY_TRANSFER_CATEGORIES = [
    "Передано или получено от Леры/Насти/Вани",
    "Передано или получено от сотрудника"
  ];

  // Check if this is an internal money transfer (not requiring receipt)
  const isInternalMoneyTransfer = watchProjectId === "Передача денег" && 
    watchCategory === "Передано или получено от Леры/Насти/Вани";

  // Auto-fill no_receipt and reason for internal money transfers
  useEffect(() => {
    if (isInternalMoneyTransfer && !editTransaction) {
      form.setValue("no_receipt", true);
      form.setValue("no_receipt_reason", "Внутренняя передача денег");
    }
  }, [isInternalMoneyTransfer, form, editTransaction]);

  // Auto-select "Наличка Ваня" for specific static projects
  const VANYA_CASH_PROJECTS = [
    'Расходы вне проекта',
    'Склад / Офис',
    'Оплата связи и сервисов',
    'Новогодняя премия',
    'Бонус',
  ];
  
  useEffect(() => {
    if (!watchProjectId || editTransaction) return;
    
    const isVanyaProject = VANYA_CASH_PROJECTS.includes(watchProjectId) || 
      watchProjectId.startsWith('Оклад ');
    
    if (isVanyaProject) {
      form.setValue('whose_project', 'Наличка Ваня');
      setIsWhoseProjectAutoFilled(true);
    }
  }, [watchProjectId, form, editTransaction]);

  useEffect(() => {
    if (watchNoReceipt && files.length === 0 && !isMoneyTransfer && !isInternalMoneyTransfer) {
      // Auto-focus on reason field when "no receipt" is checked and no files
      const reasonField = document.querySelector('textarea[name="no_receipt_reason"]') as HTMLTextAreaElement;
      if (reasonField) {
        reasonField.focus();
      }
    }
  }, [watchNoReceipt, files.length, isMoneyTransfer, isInternalMoneyTransfer]);

  // Auto-focus category search when select opens
  useEffect(() => {
    if (categorySelectOpen && categorySearchInputRef.current) {
      setTimeout(() => {
        categorySearchInputRef.current?.focus();
      }, 100);
    }
  }, [categorySelectOpen]);

  // Auto-focus project search when select opens
  useEffect(() => {
    if (projectSelectOpen && projectSearchInputRef.current) {
      setTimeout(() => {
        projectSearchInputRef.current?.focus();
      }, 100);
    }
  }, [projectSelectOpen]);

  // Auto-focus whose project search when select opens
  useEffect(() => {
    if (whoseProjectSelectOpen && whoseProjectSearchInputRef.current) {
      setTimeout(() => {
        whoseProjectSearchInputRef.current?.focus();
      }, 100);
    }
  }, [whoseProjectSelectOpen]);

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
        
        // Initialize money transfer state for edit mode
        const isTransferCategory = MONEY_TRANSFER_CATEGORIES.includes(editTransaction.category);
        if (isTransferCategory) {
          setIsMoneyTransfer(true);
          setTransferToUserId(editTransaction.transfer_to_user_id || "");
        } else {
          setIsMoneyTransfer(false);
          setTransferToUserId("");
        }
        
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
        setIsMoneyTransfer(false);
        setTransferToUserId("");
        setIsWhoseProjectAutoFilled(false);
        setIsDescriptionAutoFilled(false);
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
        .select('id, name, project_owner')
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
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    if (submitting) { submitLockRef.current = false; return; }

    const isTransferCategorySelected = MONEY_TRANSFER_CATEGORIES.includes(data.category);

    // Validate money transfer based on selected category (not transient UI state)
    if (isTransferCategorySelected) {
      if (!transferToUserId) {
        toast({
          title: "Ошибка",
          description: "Выберите получателя денег",
          variant: "destructive",
        });
        submitLockRef.current = false;
        return;
      }

      if (!data.expense_amount || data.expense_amount <= 0) {
        toast({
          title: "Ошибка",
          description: "Укажите сумму передачи (должна быть больше 0)",
          variant: "destructive",
        });
        submitLockRef.current = false;
        return;
      }

      if (data.income_amount) {
        toast({
          title: "Ошибка",
          description: "При передаче денег заполняйте только поле 'Трата'",
          variant: "destructive",
        });
        submitLockRef.current = false;
        return;
      }
    }

    // Check if this is an internal money transfer (doesn't require receipt)
    const isInternalTransfer = data.project_id === "Передача денег" && 
      data.category === "Передано или получено от Леры/Насти/Вани";

    // Validate no_receipt_reason for regular users
    if (!isAdmin && data.no_receipt && !isInternalTransfer && (!data.no_receipt_reason || data.no_receipt_reason.trim().length < 10)) {
      toast({
        title: "Ошибка",
        description: "При отсутствии чека необходимо указать причину (минимум 10 символов)",
        variant: "destructive",
      });
      submitLockRef.current = false;
      return;
    }

    // Validate files and no_receipt logic
    // For regular users, require files OR no_receipt with reason
    // For money transfers and internal transfers, files are optional
    if (!isAdmin && !isTransferCategorySelected && !isInternalTransfer) {
      if (!data.no_receipt && files.length === 0) {
        toast({
          title: "Ошибка",
          description: "Загрузите чек или отметьте 'Чека нет' с указанием причины",
          variant: "destructive",
        });
        submitLockRef.current = false;
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
      submitLockRef.current = false;
      return;
    }

    if (!currentTenant?.id) {
      toast({
        title: "Ошибка",
        description: "Тенант не определён. Попробуйте обновить страницу.",
        variant: "destructive",
      });
      submitLockRef.current = false;
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

      // Resolve recipient auth uid BEFORE building transaction data
      let resolvedTransferToUserId: string | null = null;
      if (isTransferCategorySelected && transferToUserId) {
        try {
          const { data: resolvedId, error: resolveError } = await (supabase.rpc as any)('resolve_transfer_recipient', {
            p_selected_id: transferToUserId,
            p_tenant_id: currentTenant.id,
          });
          if (!resolveError && resolvedId) {
            resolvedTransferToUserId = resolvedId;
            console.log('🔄 Resolved recipient:', transferToUserId, '->', resolvedTransferToUserId);
          } else {
            console.warn('⚠️ resolve_transfer_recipient returned null/error, using original ID:', resolveError?.message);
            resolvedTransferToUserId = transferToUserId;
          }
        } catch (resolveErr) {
          console.warn('⚠️ resolve_transfer_recipient RPC unavailable, using original ID');
          resolvedTransferToUserId = transferToUserId;
        }
      }

      if (isTransferCategorySelected && !resolvedTransferToUserId) {
        throw new Error('Не удалось определить получателя перевода');
      }
      
      const transactionData = {
        operation_date: data.operation_date.toISOString().split('T')[0],
        project_id: isStaticProject ? null : (projectId || null),
        static_project_name: isStaticProject ? projectId : null,
        project_owner: data.whose_project,
        description: data.description,
        expense_amount: data.expense_amount || 0,
        income_amount: data.income_amount || 0,
        cash_type: data.whose_project,
        category: data.category,
        no_receipt: data.no_receipt,
        no_receipt_reason: data.no_receipt ? data.no_receipt_reason : null,
        created_by: user.id,
        tenant_id: currentTenant.id,
        verification_status: 'pending',
        requires_verification: true,
        // Money transfer fields — always use resolved auth uid
        transfer_to_user_id: resolvedTransferToUserId,
        transfer_status: isTransferCategorySelected ? 'pending' : null,
      };

      let transactionResult;
      
      if (editTransaction) {
        // For rejected transfers, use the original recipient ID if not changed
        const recipientId = transferToUserId || editTransaction.transfer_to_user_id;
        
        // Check if this is a rejected money transfer being re-sent
        const wasRejectedTransfer = editTransaction.transfer_status === 'rejected' && 
                                   isTransferCategorySelected && 
                                   recipientId;

        console.log('🔍 Edit transaction check:', {
          isEdit: true,
          originalStatus: editTransaction.transfer_status,
          isMoneyTransfer: isTransferCategorySelected,
          recipientId,
          wasRejectedTransfer,
        });

        // Update existing transaction
        const updateData = wasRejectedTransfer ? {
          ...transactionData,
          transfer_to_user_id: recipientId, // Ensure recipient ID is set
          transfer_rejection_reason: null, // Clear rejection reason when re-sending
        } : transactionData;

        const { data: transaction, error } = await supabase
          .from('financial_transactions')
          .update(updateData)
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
            new_data: updateData,
            change_description: wasRejectedTransfer ? 'Rejected transfer re-sent' : 'Transaction updated'
          }]);

        // If this was a rejected transfer being edited and re-sent, send notification
        if (wasRejectedTransfer) {
          console.log('💸 Re-sending money transfer notification after edit...', {
            transactionId: transaction.id,
            recipientId,
          });

          // Get sender's info
          const { data: userData } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userData.user?.id)
            .maybeSingle();

          const notifTitle = 'Вам переведены деньги';
          const notifMessage = `${profile?.full_name || 'Сотрудник'} передал вам ${data.expense_amount} ₽`;
          const notifData = {
            transaction_id: transaction.id,
            from_user_name: profile?.full_name || 'Сотрудник',
            amount: data.expense_amount,
            cash_type: data.whose_project,
            description: data.description,
            status: 'pending',
          };

          // Insert notification directly into DB
          try {
            await supabase.from('notifications').insert({
              user_id: recipientId,
              title: notifTitle,
              message: notifMessage,
              type: 'money_transfer',
              data: notifData,
            });
            console.log('✅ Re-send notification inserted into DB');
          } catch (dbErr) {
            console.error('❌ DB notification insert failed:', dbErr);
          }

          // Also try push via edge function (best-effort)
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: { user_id: recipientId, title: notifTitle, message: notifMessage, type: 'money_transfer', data: notifData },
            });
            console.log('✅ Push notification re-sent via edge function');
          } catch (notifyErr) {
            console.error('⚠️ Edge function push failed:', notifyErr);
          }
        }
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
            change_description: 'Транзакция создана'
          }]);

        // If this is a money transfer, send notification to recipient
        if (isTransferCategorySelected && resolvedTransferToUserId) {
          const resolvedRecipientId = resolvedTransferToUserId;

          console.log('💸 Money transfer details:', {
            transactionId: transaction.id,
            selectedRecipientId: transferToUserId,
            resolvedRecipientId: resolvedRecipientId,
            senderId: user.id,
            amount: data.expense_amount,
          });

          // Get sender's info (try user_id first for self-hosted DB)
          const { data: userData } = await supabase.auth.getUser();
          let profile: any = null;
          const { data: p1 } = await (supabase.from('profiles') as any)
            .select('full_name')
            .eq('user_id', userData.user?.id)
            .maybeSingle();
          profile = p1;
          if (!profile) {
            const { data: p2 } = await supabase.from('profiles')
              .select('full_name')
              .eq('id', userData.user?.id)
              .maybeSingle();
            profile = p2;
          }

          const notifTitle = 'Вам переведены деньги';
          const notifMessage = `${profile?.full_name || 'Сотрудник'} передал вам ${data.expense_amount} ₽`;
          const notifData = {
            transaction_id: transaction.id,
            from_user_name: profile?.full_name || 'Сотрудник',
            amount: data.expense_amount,
            cash_type: data.whose_project,
            description: data.description,
          };

          // Use SECURITY DEFINER RPC to bypass RLS for notification delivery
          try {
            const { error: rpcError } = await (supabase.rpc as any)('notify_money_transfer', {
              p_recipient_user_id: resolvedRecipientId,
              p_title: notifTitle,
              p_message: notifMessage,
              p_data: notifData,
            });
            if (rpcError) {
              console.error('❌ RPC notify_money_transfer failed, falling back to direct insert:', rpcError);
              // Fallback to direct insert
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                  user_id: resolvedRecipientId,
                  title: notifTitle,
                  message: notifMessage,
                  type: 'money_transfer',
                  data: notifData,
                });
              if (notifError) {
                console.error('❌ Direct notification insert also failed:', notifError);
              } else {
                console.log('✅ Notification inserted via direct insert fallback');
              }
            } else {
              console.log('✅ Money transfer notification inserted via RPC');
            }
          } catch (dbNotifErr) {
            console.error('❌ Notification delivery failed:', dbNotifErr);
          }

          // Also try edge function for push notifications (best-effort)
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id: resolvedRecipientId,
                title: notifTitle,
                message: notifMessage,
                type: 'money_transfer',
                data: notifData,
              },
            });
            console.log('✅ Push notification sent via edge function');
          } catch (notifyErr) {
            console.error('⚠️ Edge function push failed (notification already saved to DB):', notifyErr);
          }
        }

      }

      // Upload files if any. For new transactions keep strict atomic behavior: if receipt save fails, remove transaction.
      if (files.length > 0) {
        try {
          await uploadFiles(transactionResult.id, user.id);
        } catch (uploadError) {
          if (!editTransaction) {
            const { error: rollbackError } = await supabase
              .from('financial_transactions')
              .delete()
              .eq('id', transactionResult.id);

            if (rollbackError) {
              console.error('Rollback failed after receipt upload error:', rollbackError);
            }
          }
          throw uploadError;
        }
      }

      // Send notification to admins for large transactions (over 10000)
      // But only if user is not admin themselves
      // Wrapped in try-catch so notification failure doesn't affect the transaction
      try {
        const amount = data.expense_amount || data.income_amount || 0;
        if (amount >= 10000 && !isMoneyTransfer && !isAdmin) {
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
      } catch (notifyErr) {
        console.error('Failed to send admin notification:', notifyErr);
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
      submitLockRef.current = false;
    }
  };

  const uploadFiles = async (transactionId: string, userId: string) => {
    const { compressAndConvertToBase64 } = await import('@/utils/imageCompressor');

    const isMissingRelationError = (err: any, relationName: string) => {
      const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
      return err?.code === '42P01' || (text.includes('relation') && text.includes(relationName.toLowerCase()) && text.includes('does not exist'));
    };

    const isMissingColumnError = (err: any, columnName: string) => {
      const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
      return err?.code === '42703' || (text.includes('column') && text.includes(columnName.toLowerCase()) && text.includes('does not exist'));
    };

    const formatDbError = (err: any) => {
      return err?.message || err?.details || err?.hint || 'неизвестная ошибка базы данных';
    };

    const preparedFiles = await Promise.all(
      files.map(async (fileItem) => {
        const dataUrl = await compressAndConvertToBase64(fileItem.file);
        return { fileItem, dataUrl };
      })
    );

    for (const { fileItem, dataUrl } of preparedFiles) {
      let { error: financialAttachmentError } = await (supabase
        .from('financial_attachments') as any)
        .insert([
          {
            transaction_id: transactionId,
            storage_path: dataUrl,
            original_filename: fileItem.file.name,
            mime_type: fileItem.file.type || 'application/octet-stream',
            size_bytes: fileItem.file.size,
            created_by: userId,
          },
        ]);

      // Backward compatibility: some DBs have financial_attachments with legacy column names
      if (financialAttachmentError && (
        isMissingColumnError(financialAttachmentError, 'storage_path') ||
        isMissingColumnError(financialAttachmentError, 'original_filename') ||
        isMissingColumnError(financialAttachmentError, 'mime_type') ||
        isMissingColumnError(financialAttachmentError, 'size_bytes')
      )) {
        const legacyInsert = await (supabase
          .from('financial_attachments') as any)
          .insert([
            {
              transaction_id: transactionId,
              file_url: dataUrl,
              file_name: fileItem.file.name,
              file_type: fileItem.file.type || 'application/octet-stream',
              file_size: fileItem.file.size,
              created_by: userId,
            },
          ]);

        financialAttachmentError = legacyInsert.error;
      }

      if (!financialAttachmentError) {
        continue;
      }

      if (!isMissingRelationError(financialAttachmentError, 'financial_attachments')) {
        console.error('financial_attachments insert failed:', financialAttachmentError);
        throw new Error(`Не удалось сохранить чеки в базе данных: ${formatDbError(financialAttachmentError)}`);
      }

      // Fallback for older schema
      const { error: transactionAttachmentError } = await (supabase
        .from('transaction_attachments') as any)
        .insert([
          {
            transaction_id: transactionId,
            file_url: dataUrl,
            file_name: fileItem.file.name,
            file_type: fileItem.file.type || 'application/octet-stream',
            file_size: fileItem.file.size,
          },
        ]);

      if (transactionAttachmentError) {
        console.error('transaction_attachments fallback insert failed:', transactionAttachmentError);
        throw new Error(`Не удалось сохранить чеки в базе данных: ${formatDbError(transactionAttachmentError)}`);
      }
    }
  };


  if (loading) {
    if (inline) {
      return (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    
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

  const formContent = (
    <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="operation_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата операции</FormLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
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
                          onSelect={(date) => {
                            field.onChange(date);
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className="p-3 pointer-events-auto"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Подробное описание</FormLabel>
                    {isDescriptionAutoFilled && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 animate-in fade-in-50 duration-300">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Автоматически
                      </span>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={
                        MONEY_TRANSFER_CATEGORIES.includes(form.watch("category"))
                          ? "Например: Передал на наличные расходы по проекту"
                          : "Опишите операцию..."
                      }
                      className={cn(
                        "resize-none",
                        isDescriptionAutoFilled && "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-500/20"
                      )}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // If user manually changes the value, remove auto-fill indicator
                        if (isDescriptionAutoFilled) {
                          setIsDescriptionAutoFilled(false);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  
                  {/* AI Transaction Suggestions */}
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Анализ описания...</span>
                    </div>
                  )}

                  {aiSuggestions && aiConfidence > 0.6 && !isAnalyzing && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in-50 duration-300">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                            AI предлагает:
                          </p>
                          <div className="space-y-1">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <span className="font-medium">Категория:</span> {aiSuggestions.category}
                            </p>
                            {aiSuggestions.project && (
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <span className="font-medium">Проект:</span> {aiSuggestions.project}
                              </p>
                            )}
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Уверенность: {Math.round(aiConfidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button 
                            type="button"
                            size="sm" 
                            onClick={applyAISuggestions}
                            className="h-10 min-h-[44px] text-xs"
                          >
                            Применить
                          </Button>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="ghost" 
                            onClick={dismissSuggestions}
                            className="h-10 w-10 min-h-[44px] min-w-[44px] p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Grammar Check Feedback */}
                  {isChecking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Проверка текста...</span>
                    </div>
                  )}

                  {hasErrors && correctedText && !isChecking && (
                    <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Найдены ошибки в описании
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Исправленный вариант: <strong>{correctedText}</strong>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleApplyCorrection}
                          className="h-10 min-h-[44px] flex-shrink-0"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Применить
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Apply All button - shown when both correction and suggestions are available */}
                  {hasErrors && correctedText && !isChecking && aiSuggestions && aiConfidence > 0.6 && !isAnalyzing && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyAll}
                        className="w-full h-10 min-h-[44px]"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Применить все предложения
                      </Button>
                    </div>
                  )}
                </FormItem>
              )}
            />

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
                    <Select 
                      value={field.value} 
                      onValueChange={async (value) => {
                        field.onChange(value);
                        
                        // Check if this is an event (UUID) or static project
                        const isStaticProject = STATIC_PROJECTS.includes(value);
                        
                        // Reset category if switching to/from "Передача денег" project
                        const isMoneyTransferProject = value === "Передача денег";
                        const currentCategory = form.watch("category");
                        const moneyTransferCategories = [
                          "Передано или получено от Леры/Насти/Вани",
                          "Передано или получено от сотрудника"
                        ];
                        
                        // If switching to money transfer project and current category is not in allowed list
                        if (isMoneyTransferProject && currentCategory && !moneyTransferCategories.includes(currentCategory)) {
                          form.setValue("category", undefined);
                          toast({
                            title: "Внимание",
                            description: "Для проекта 'Передача денег' выберите одну из категорий передачи",
                            duration: 3000,
                          });
                        }
                        
                        // If switching from money transfer project to another and category is transfer-specific
                        if (!isMoneyTransferProject && currentCategory && moneyTransferCategories.includes(currentCategory)) {
                          form.setValue("category", undefined);
                        }
                        
                        if (!isStaticProject) {
                          // This is an event ID, find it in the events array
                          const selectedEvent = events.find(e => e.id === value);
                          
                          if (selectedEvent?.project_owner) {
                            const cashType = mapProjectOwnerToCashType(selectedEvent.project_owner);
                            if (cashType) {
                              form.setValue('whose_project', cashType);
                              setIsWhoseProjectAutoFilled(true);
                              
                              // Show toast notification
                              toast({
                                title: "Автоматически заполнено",
                                description: `Выбрано: ${cashType}`,
                                duration: 2000,
                              });
                              
                              // Auto-hide the indicator after 3 seconds
                              setTimeout(() => {
                                setIsWhoseProjectAutoFilled(false);
                              }, 3000);
                            }
                          }
                        } else {
                          // For static projects, reset auto-fill state
                          setIsWhoseProjectAutoFilled(false);
                        }
                      }}
                      open={projectSelectOpen}
                      onOpenChange={setProjectSelectOpen}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="sticky top-0 p-2 bg-background border-b border-border mb-2 z-10">
                          <input
                            ref={projectSearchInputRef}
                            data-project-search
                            type="text"
                            placeholder="Поиск проекта..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Select first filtered result
                                const firstResult = filteredStaticProjects[0] || (filteredEvents[0]?.id);
                                if (firstResult) {
                                  field.onChange(firstResult);
                                  setProjectSelectOpen(false);
                                  setProjectSearch('');
                                }
                              }
                            }}
                          />
                        </div>
                        {filteredStaticProjects.map((project, index) => (
                          <SelectItem 
                            key={`static-${project}`} 
                            value={project}
                            className={index === 0 && filteredStaticProjects.length > 0 ? 
                              "bg-primary/10 border-l-2 border-primary relative" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{project}</span>
                              {index === 0 && filteredStaticProjects.length > 0 && (
                                <span className="text-xs text-primary ml-2">↵ Enter</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        {filteredStaticProjects.length > 0 && filteredEvents.length > 0 && (
                          <div className="mx-2 my-1 border-t border-border" />
                        )}
                        {filteredEvents.map((event, index) => (
                          <SelectItem 
                            key={event.id} 
                            value={event.id}
                            className={index === 0 && filteredStaticProjects.length === 0 ? 
                              "bg-primary/10 border-l-2 border-primary relative" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{event.name}</span>
                              {index === 0 && filteredStaticProjects.length === 0 && (
                                <span className="text-xs text-primary ml-2">↵ Enter</span>
                              )}
                            </div>
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
              name="category"
              render={({ field }) => {
                // If "Передача денег" project is selected, show only transfer categories
                const isMoneyTransferProject = form.watch("project_id") === "Передача денег";
                const moneyTransferCategories = [
                  "Передано или получено от Леры/Насти/Вани",
                  "Передано или получено от сотрудника"
                ];
                
                const categoryNames = transactionCategories.map(c => c.name);
                const filteredCategories = (isMoneyTransferProject ? moneyTransferCategories : categoryNames)
                  .filter(category =>
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
                        if (MONEY_TRANSFER_CATEGORIES.includes(value)) {
                          setIsMoneyTransfer(true);
                          setIsDescriptionAutoFilled(true);
                          form.setValue('no_receipt', true);
                          form.setValue('no_receipt_reason', 'Внутренняя передача денег между сотрудниками');
                          form.setValue('income_amount', undefined);
                          
                          // Auto-hide the indicator after 3 seconds
                          setTimeout(() => {
                            setIsDescriptionAutoFilled(false);
                          }, 3000);
                        } else if (value === 'Получено/Возвращено клиенту') {
                          // Auto-fill description for client category
                          form.setValue('description', 'Получил(а) от клиента');
                          setIsDescriptionAutoFilled(true);
                          
                          toast({
                            title: "Автоматически заполнено",
                            description: "Описание: Получил(а) от клиента",
                            duration: 2000,
                          });
                          
                          // Auto-hide the indicator after 3 seconds
                          setTimeout(() => {
                            setIsDescriptionAutoFilled(false);
                          }, 3000);
                          
                          setIsMoneyTransfer(false);
                          setTransferToUserId("");
                        } else {
                          setIsMoneyTransfer(false);
                          setTransferToUserId("");
                          setIsDescriptionAutoFilled(false);
                          // Reset no_receipt when switching away
                          form.setValue('no_receipt', false);
                          form.setValue('no_receipt_reason', '');
                        }
                      }}
                      open={categorySelectOpen}
                      onOpenChange={setCategorySelectOpen}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="sticky top-0 p-2 bg-background border-b border-border mb-2 z-10">
                          <input
                            ref={categorySearchInputRef}
                            data-category-search
                            type="text"
                            placeholder="Поиск категории..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Select first filtered result
                                const firstResult = filteredCategories[0];
                                if (firstResult) {
                                  field.onChange(firstResult);
                                  // Handle category selection logic
                                   if (MONEY_TRANSFER_CATEGORIES.includes(firstResult)) {
                                     setIsMoneyTransfer(true);
                                     setIsDescriptionAutoFilled(true);
                                     form.setValue('no_receipt', true);
                                     form.setValue('no_receipt_reason', 'Внутренняя передача денег между сотрудниками');
                                     form.setValue('income_amount', undefined);
                                     
                                     setTimeout(() => {
                                       setIsDescriptionAutoFilled(false);
                                     }, 3000);
                                   } else if (firstResult === 'Получено/Возвращено клиенту') {
                                     form.setValue('description', 'Получил(а) от клиента');
                                     setIsDescriptionAutoFilled(true);
                                     
                                     toast({
                                       title: "Автоматически заполнено",
                                       description: "Описание: Получил(а) от клиента",
                                       duration: 2000,
                                     });
                                     
                                     setTimeout(() => {
                                       setIsDescriptionAutoFilled(false);
                                     }, 3000);
                                     
                                     setIsMoneyTransfer(false);
                                     setTransferToUserId("");
                                   } else {
                                     setIsMoneyTransfer(false);
                                     setTransferToUserId("");
                                     setIsDescriptionAutoFilled(false);
                                     form.setValue('no_receipt', false);
                                     form.setValue('no_receipt_reason', '');
                                   }
                                  setCategorySelectOpen(false);
                                  setCategorySearch('');
                                }
                              }
                            }}
                          />
                        </div>
                        {filteredCategories.map((option, index) => (
                          <SelectItem 
                            key={option} 
                            value={option}
                            className={index === 0 ? 
                              "bg-primary/10 border-l-2 border-primary relative" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{option}</span>
                              {index === 0 && (
                                <span className="text-xs text-primary ml-2">↵ Enter</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Money Transfer Section - Show when category is employee transfer */}
            {MONEY_TRANSFER_CATEGORIES.includes(form.watch("category")) && (
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
                    onValueChange={(value) => {
                      setTransferToUserId(value);
                      // Auto-fill description with declined name when employee is selected
                      const selectedEmployee = employees.find(emp => emp.id === value);
                      if (selectedEmployee && currentUserProfile) {
                        // Convert "Фамилия Имя Отчество" → "Имя Фамилия" for natural dative
                        const nameParts = (selectedEmployee.full_name || '').trim().split(/\s+/);
                        const displayName = nameParts.length >= 2
                          ? `${nameParts[1]} ${nameParts[0]}`
                          : selectedEmployee.full_name || '';
                        const declinedName = declineFullNameToDative(displayName);
                        const gender = detectGender(currentUserProfile.full_name);
                        const verb = gender === 'female' ? 'Передала' : 'Передал';
                        form.setValue("description", `${verb} ${declinedName}`);
                      }
                    }}
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
                            {employee.full_name}{employee.email ? ` (${employee.email})` : ''}
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

            <FormField
              control={form.control}
              name="whose_project"
              render={({ field }) => {
                const filteredOwners = PROJECT_OWNERS.filter(owner =>
                  owner.toLowerCase().includes(whoseProjectSearch.toLowerCase())
                );

                return (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Чей проект</FormLabel>
                      {isWhoseProjectAutoFilled && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 animate-in fade-in-50 duration-300">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Автоматически
                        </span>
                      )}
                    </div>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // If user manually changes the value, remove auto-fill indicator
                        setIsWhoseProjectAutoFilled(false);
                      }}
                      open={whoseProjectSelectOpen}
                      onOpenChange={setWhoseProjectSelectOpen}
                    >
                      <FormControl>
                        <SelectTrigger 
                          className={cn(
                            isWhoseProjectAutoFilled && "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-500/20"
                          )}
                        >
                          <SelectValue placeholder="Выберите" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="sticky top-0 p-2 bg-background border-b border-border mb-2 z-10">
                          <input
                            ref={whoseProjectSearchInputRef}
                            data-whose-project-search
                            type="text"
                            placeholder="Поиск..."
                            value={whoseProjectSearch}
                            onChange={(e) => setWhoseProjectSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Select first filtered result
                                const firstResult = filteredOwners[0];
                                if (firstResult) {
                                  field.onChange(firstResult);
                                  setWhoseProjectSelectOpen(false);
                                  setWhoseProjectSearch('');
                                }
                              }
                            }}
                          />
                        </div>
                        {filteredOwners.map((option, index) => (
                          <SelectItem 
                            key={option} 
                            value={option}
                            className={index === 0 ? 
                              "bg-primary/10 border-l-2 border-primary relative" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{option}</span>
                              {index === 0 && (
                                <span className="text-xs text-primary ml-2">↵ Enter</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="expense_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Сумма Траты
                      {MONEY_TRANSFER_CATEGORIES.includes(form.watch("category")) && (
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
                          MONEY_TRANSFER_CATEGORIES.includes(form.watch("category"))
                            ? "Сумма передачи сотруднику"
                            : "Введите сумму"
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
                    <FormLabel>Сумма Прихода</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          if (value !== undefined && value !== null && value !== 0) {
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

            <div className="space-y-4">
              <FormLabel>Чек / вложения</FormLabel>
              
              {!isInternalMoneyTransfer && (
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={5}
                  maxSize={10} // 10MB
                />
              )}

              {isInternalMoneyTransfer && (
                <p className="text-sm text-muted-foreground">
                  Для внутренней передачи денег чек не требуется
                </p>
              )}

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
                          disabled={isInternalMoneyTransfer}
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
                          disabled={isInternalMoneyTransfer}
                        />
                      </FormControl>
                      <FormDescription>
                        {isInternalMoneyTransfer 
                          ? "Автоматически заполнено для внутренней передачи денег"
                          : "Минимум 10 символов"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 sm:h-9"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1 h-10 sm:h-9"
              >
                {submitting ? "Сохранение..." : editTransaction ? "Обновить" : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
  );

  if (inline) {
    return formContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editTransaction ? "Редактировать транзакцию" : "Внести трату/приход"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editTransaction 
                ? "Внесите изменения в транзакцию" 
                : "Заполните форму для добавления новой финансовой транзакции"
              }
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}