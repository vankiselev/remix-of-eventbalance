import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PhoneInputRU } from "@/components/ui/phone-input-ru";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { Upload, ChevronDown, History, Wallet, UserX, Trash2, UserCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/formatCurrency';

const profileSchema = z.object({
  full_name: z.string().min(1, "Имя обязательно"),
  email: z.string().email("Некорректный email"),
  phone_display: z.string().optional(),
  phone_e164: z.string().optional(),
  birth_date: z.string().optional(),
  position: z.string().optional(), // Made optional for administrators
  hire_date: z.string().optional(), // Made optional for administrators
  salary: z.string().optional(),
  role: z.enum(['admin', 'employee']).optional(),
  notes: z.string().optional(), // Added notes field
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Employee {
  id: string;
  user_id: string;
  position: string;
  salary: number | null;
  hire_date: string;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'employee';
    phone?: string;
    phone_e164?: string;
    birth_date?: string;
    avatar_url?: string;
    created_at: string;
    employment_status?: string;
    termination_date?: string;
    termination_reason?: string;
  };
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  phone?: string;
  phone_e164?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
  employment_status?: string;
  termination_date?: string;
  termination_reason?: string;
}

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface EditHistory {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  edited_by: {
    full_name: string;
  };
}

interface EmployeeProfileDialogProps {
  employee: Employee | null;
  profile?: Profile; // Added for administrator users without employee record
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (wasTerminated?: boolean) => void;
  isAdmin: boolean;
}

export const EmployeeProfileDialog = ({ 
  employee, 
  profile,
  isOpen, 
  onOpenChange, 
  onSuccess, 
  isAdmin 
}: EmployeeProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cashSummary, setCashSummary] = useState<CashSummary>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Get the current user data (either from employee or profile)
  const currentUser = employee ? employee.profiles : profile;
  const isCurrentUserSuperAdmin = user?.email === 'ikiselev@me.com';
  const canEditRole = isCurrentUserSuperAdmin;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_display: "",
      phone_e164: "",
      birth_date: "",
      position: "",
      hire_date: "",
      salary: "",
      role: "employee",
      notes: "",
    },
  });

  useEffect(() => {
    if ((employee || profile) && isOpen) {
      const userData = currentUser;
      if (!userData) return;

      form.reset({
        full_name: userData.full_name,
        email: userData.email,
        phone_display: userData.phone || "",
        phone_e164: userData.phone_e164 || "",
        birth_date: userData.birth_date || "",
        position: employee?.position || "",
        hire_date: employee?.hire_date || "",
        salary: employee?.salary?.toString() || "",
        role: userData.role,
        notes: "", // Will be populated if we add notes to database
      });
      
      fetchEditHistory();
      fetchCashSummary();
    }
  }, [employee, profile, isOpen, form, currentUser]);

  const fetchEditHistory = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("profile_edit_history")
        .select(`
          id,
          field_name,
          old_value,
          new_value,
          created_at,
          edited_by:profiles!profile_edit_history_edited_by_fkey(full_name)
        `)
        .eq("profile_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEditHistory(data || []);
    } catch (error) {
      console.error("Error fetching edit history:", error);
    }
  };

  const fetchCashSummary = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .rpc("get_employee_cash_summary", { employee_user_id: currentUser.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCashSummary(data[0]);
      }
    } catch (error) {
      console.error("Error fetching cash summary:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Добавляем timestamp для обхода кеша
      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      toast({
        title: "Успешно!",
        description: "Фото профиля обновлено",
      });
      
      // Обновляем данные и закрываем диалог
      onSuccess();
    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: error.message || "Не удалось загрузить фото",
        });
    } finally {
      setUploading(false);
    }
  };

  const logFieldChange = async (fieldName: string, oldValue: any, newValue: any) => {
    if (!currentUser || oldValue === newValue) return;

    try {
      await supabase.rpc("log_profile_edit", {
        p_profile_id: currentUser.id,
        p_field_name: fieldName,
        p_old_value: oldValue?.toString() || null,
        p_new_value: newValue?.toString() || null,
      });
    } catch (error) {
      console.error("Error logging field change:", error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const currentProfile = currentUser;
      const currentEmployee = employee;

      // Update profile data
      const profileUpdates: any = {
        full_name: data.full_name,
        phone: data.phone_display || null,
        phone_e164: data.phone_e164 || null,
        birth_date: data.birth_date || null,
      };

      // Only admin can update email
      if (isAdmin) {
        profileUpdates.email = data.email;
      }

      // Only super admin can change role
      if (canEditRole && data.role && data.role !== currentProfile.role) {
        profileUpdates.role = data.role;
        await logFieldChange("role", currentProfile.role, data.role);
      }

      // Log changes for profile
      if (data.full_name !== currentProfile.full_name) {
        await logFieldChange("full_name", currentProfile.full_name, data.full_name);
      }
      if (data.phone_display !== (currentProfile.phone || "")) {
        await logFieldChange("phone", currentProfile.phone, data.phone_display);
      }
      if (data.birth_date !== (currentProfile.birth_date || "")) {
        await logFieldChange("birth_date", currentProfile.birth_date, data.birth_date);
      }
      if (isAdmin && data.email !== currentProfile.email) {
        await logFieldChange("email", currentProfile.email, data.email);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // Handle employee data - create or update
      if (data.position || data.hire_date || (isAdmin && data.salary)) {
        const employeeUpdates: any = {
          position: data.position || "",
          hire_date: data.hire_date || new Date().toISOString().split('T')[0],
        };

        if (isAdmin) {
          employeeUpdates.salary = data.salary ? parseFloat(data.salary) : null;
        }

        if (employee) {
          // Update existing employee record
          if (data.position !== currentEmployee?.position) {
            await logFieldChange("position", currentEmployee?.position, data.position);
          }
          if (data.hire_date !== currentEmployee?.hire_date) {
            await logFieldChange("hire_date", currentEmployee?.hire_date, data.hire_date);
          }
          if (isAdmin && data.salary !== (currentEmployee?.salary?.toString() || "")) {
            await logFieldChange("salary", currentEmployee?.salary?.toString(), data.salary);
          }

          const { error: employeeError } = await supabase
            .from("employees")
            .update(employeeUpdates)
            .eq("id", employee.id);

          if (employeeError) throw employeeError;
        } else {
          // Create new employee record for administrator
          employeeUpdates.user_id = currentUser.id;
          
          const { error: employeeError } = await supabase
            .from("employees")
            .insert([employeeUpdates]);

          if (employeeError) throw employeeError;

          // Log the creation
          await logFieldChange("employee_record_created", null, "true");
          if (data.position) await logFieldChange("position", null, data.position);
          if (data.hire_date) await logFieldChange("hire_date", null, data.hire_date);
          if (isAdmin && data.salary) await logFieldChange("salary", null, data.salary);
        }
      }

      toast({
        title: "Успешно!",
        description: "Изменения сохранены",
      });

      // Refresh the edit history and data immediately
      await fetchEditHistory();
      await fetchCashSummary();
      
      // Вызываем onSuccess для обновления списка и закрываем диалог
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const translateFieldName = (fieldName: string): string => {
    const translations: Record<string, string> = {
      'employment_status': 'Статус занятости',
      'full_name': 'ФИО',
      'email': 'Email',
      'phone': 'Телефон',
      'birth_date': 'Дата рождения',
      'position': 'Должность',
      'hire_date': 'Дата найма',
      'salary': 'Зарплата',
      'role': 'Роль',
      'avatar_url': 'Фото профиля',
      'employee_record_created': 'Создание записи сотрудника'
    };
    return translations[fieldName] || fieldName;
  };

  const translateFieldValue = (value: string | null, fieldName: string): string => {
    if (!value) return 'не указано';
    
    // Translate employment_status values
    if (fieldName === 'employment_status') {
      if (value === 'active') return 'Активен';
      if (value === 'terminated') return 'Уволен';
    }
    
    // Translate role values
    if (fieldName === 'role') {
      if (value === 'admin') return 'Администратор';
      if (value === 'employee') return 'Сотрудник';
    }
    
    return value;
  };

  const handleTerminateEmployee = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('terminate_employee', {
        employee_user_id: currentUser.id,
        termination_reason_text: terminationReason || null
      });

      if (error) throw error;

      toast({
        title: "Сотрудник уволен",
        description: "Доступ к системе заблокирован. Все записи сохранены.",
      });

      setShowTerminateDialog(false);
      setTerminationReason("");
      onSuccess(true); // Передаем флаг что был уволен
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось уволить сотрудника",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateEmployee = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('reactivate_employee', {
        employee_user_id: currentUser.id
      });

      if (error) throw error;

      toast({
        title: "Сотрудник восстановлен",
        description: "Доступ к системе возобновлен.",
      });

      setShowReactivateDialog(false);
      onSuccess(false); // Передаем флаг что не уволен
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось восстановить сотрудника",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_employee_permanently', {
        employee_user_id: currentUser.id
      });

      if (error) throw error;

      toast({
        title: "Сотрудник удален",
        description: "Все данные сотрудника безвозвратно удалены из системы.",
      });

      setShowDeleteDialog(false);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить сотрудника",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const isTerminated = currentUser.employment_status === 'terminated';
  const canManageEmployee = isAdmin && currentUser.id !== user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Профиль {currentUser.role === 'admin' ? 'администратора' : 'сотрудника'}
          </DialogTitle>
          <DialogDescription>
            Просмотр и редактирование информации о {currentUser.role === 'admin' ? 'администраторе' : 'сотруднике'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={currentUser.avatar_url} />
              <AvatarFallback>
                {currentUser.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{currentUser.full_name}</h3>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'}>
                {currentUser.role === 'admin' ? 'Администратор' : 'Сотрудник'}
              </Badge>
              <div className="mt-2">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Загрузка..." : "Изменить фото"}
                    </span>
                  </Button>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Cash Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Наличные на руках
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Наличка Настя</p>
                  <p className="text-lg">{formatCurrency(cashSummary.cash_nastya)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Наличка Лера</p>
                  <p className="text-lg">{formatCurrency(cashSummary.cash_lera)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Наличка Ваня</p>
                  <p className="text-lg">{formatCurrency(cashSummary.cash_vanya)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Итого на руках</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(cashSummary.total_cash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ФИО</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_display"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <PhoneInputRU
                          value={field.value}
                          onChange={(result) => {
                            field.onChange(result.display);
                            form.setValue("phone_e164", result.e164);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата рождения</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Должность</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите должность" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата трудоустройства</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          placeholder="Выберите дату"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role field - only super admin can edit */}
                {canEditRole && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Роль</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          >
                            <option value="employee">Сотрудник</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Зарплата (₽)</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(value) => field.onChange(value?.toString() || "")}
                            placeholder="Введите зарплату"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примечания</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Дополнительная информация (необязательно)"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                {/* Employee Management Buttons (only for admins managing other users) */}
                {canManageEmployee && (
                  <div className="flex gap-2">
                    {isTerminated ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowReactivateDialog(true)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Восстановить
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTerminateDialog(true)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Уволить
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={loading || isTerminated}>
                    {loading ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Edit History */}
          {isAdmin && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    История изменений
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {editHistory.length > 0 ? (
                  editHistory.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{translateFieldName(entry.field_name)}</p>
                          <p className="text-muted-foreground">
                            {translateFieldValue(entry.old_value, entry.field_name)} → {translateFieldValue(entry.new_value, entry.field_name)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right ml-4">
                          <p>{entry.edited_by.full_name}</p>
                          <p>{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    История изменений пуста
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Termination Status Banner */}
          {isTerminated && (
            <Card className="bg-destructive/10 border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Сотрудник уволен</CardTitle>
                <CardDescription>
                  Дата увольнения: {currentUser.termination_date ? formatDate(currentUser.termination_date) : 'Не указана'}
                  {currentUser.termination_reason && (
                    <>
                      <br />
                      Причина: {currentUser.termination_reason}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </DialogContent>

      {/* Terminate Employee Dialog */}
      <AlertDialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Уволить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Доступ сотрудника к системе будет заблокирован, но все записи останутся в базе данных.
              Вы сможете восстановить доступ позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="termination-reason">Причина увольнения (необязательно)</Label>
            <Textarea
              id="termination-reason"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Укажите причину увольнения..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateEmployee}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? "Увольнение..." : "Уволить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Employee Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Доступ сотрудника к системе будет восстановлен. Он сможет снова входить и работать с данными.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateEmployee}
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Восстановление..." : "Восстановить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Employee Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника навсегда?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                ⚠️ Это действие необратимо!
              </p>
              <p>
                Будут безвозвратно удалены:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Профиль сотрудника</li>
                <li>Все финансовые транзакции</li>
                <li>Все события и мероприятия</li>
                <li>История изменений</li>
                <li>Все связанные данные</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Удаление..." : "Удалить навсегда"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};