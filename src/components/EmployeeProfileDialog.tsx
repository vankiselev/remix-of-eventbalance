import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, ChevronDown, History, Wallet } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "Имя обязательно"),
  email: z.string().email("Некорректный email"),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  position: z.string().min(1, "Должность обязательна"),
  hire_date: z.string().min(1, "Дата трудоустройства обязательна"),
  salary: z.string().optional(),
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
    birth_date?: string;
    avatar_url?: string;
    created_at: string;
  };
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
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isAdmin: boolean;
}

export const EmployeeProfileDialog = ({ 
  employee, 
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
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      birth_date: "",
      position: "",
      hire_date: "",
      salary: "",
    },
  });

  useEffect(() => {
    if (employee && isOpen) {
      form.reset({
        full_name: employee.profiles.full_name,
        email: employee.profiles.email,
        phone: employee.profiles.phone || "",
        birth_date: employee.profiles.birth_date || "",
        position: employee.position,
        hire_date: employee.hire_date,
        salary: employee.salary?.toString() || "",
      });
      
      fetchEditHistory();
      fetchCashSummary();
    }
  }, [employee, isOpen, form]);

  const fetchEditHistory = async () => {
    if (!employee) return;

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
        .eq("profile_id", employee.profiles.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEditHistory(data || []);
    } catch (error) {
      console.error("Error fetching edit history:", error);
    }
  };

  const fetchCashSummary = async () => {
    if (!employee) return;

    try {
      const { data, error } = await supabase
        .rpc("get_employee_cash_summary", { employee_user_id: employee.user_id });

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
    if (!file || !employee) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employee.user_id}.${fileExt}`;
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
        .eq("id", employee.profiles.id);

      if (updateError) throw updateError;

      toast({
        title: "Успешно!",
        description: "Фото профиля обновлено",
      });
      
      // Обновляем данные сотрудника и закрываем диалог
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
    if (!employee || oldValue === newValue) return;

    try {
      await supabase.rpc("log_profile_edit", {
        p_profile_id: employee.profiles.id,
        p_field_name: fieldName,
        p_old_value: oldValue?.toString() || null,
        p_new_value: newValue?.toString() || null,
      });
    } catch (error) {
      console.error("Error logging field change:", error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!employee) return;

    setLoading(true);
    try {
      const currentProfile = employee.profiles;
      const currentEmployee = employee;

      // Update profile data
      const profileUpdates: any = {
        full_name: data.full_name,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
      };

      // Only admin can update email
      if (isAdmin) {
        profileUpdates.email = data.email;
      }

      // Log changes for profile
      if (data.full_name !== currentProfile.full_name) {
        await logFieldChange("full_name", currentProfile.full_name, data.full_name);
      }
      if (data.phone !== (currentProfile.phone || "")) {
        await logFieldChange("phone", currentProfile.phone, data.phone);
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
        .eq("id", employee.profiles.id);

      if (profileError) throw profileError;

      // Update employee data
      const employeeUpdates: any = {
        position: data.position,
        hire_date: data.hire_date,
      };

      if (isAdmin) {
        employeeUpdates.salary = data.salary ? parseFloat(data.salary) : null;
      }

      // Log changes for employee
      if (data.position !== currentEmployee.position) {
        await logFieldChange("position", currentEmployee.position, data.position);
      }
      if (data.hire_date !== currentEmployee.hire_date) {
        await logFieldChange("hire_date", currentEmployee.hire_date, data.hire_date);
      }
      if (isAdmin && data.salary !== (currentEmployee.salary?.toString() || "")) {
        await logFieldChange("salary", currentEmployee.salary?.toString(), data.salary);
      }

      const { error: employeeError } = await supabase
        .from("employees")
        .update(employeeUpdates)
        .eq("id", employee.id);

      if (employeeError) throw employeeError;

      toast({
        title: "Успешно!",
        description: "Изменения сохранены",
      });

      // Refresh the edit history and data immediately
      await fetchEditHistory();
      await fetchCashSummary();
      
      // Вызываем onSuccess для обновления списка сотрудников и закрываем диалог
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Профиль сотрудника</DialogTitle>
          <DialogDescription>
            Просмотр и редактирование информации о сотруднике
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={employee.profiles.avatar_url} />
              <AvatarFallback>
                {employee.profiles.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{employee.profiles.full_name}</h3>
              <p className="text-sm text-muted-foreground">{employee.profiles.email}</p>
              <Badge variant={employee.profiles.role === 'admin' ? 'default' : 'secondary'}>
                {employee.profiles.role === 'admin' ? 'Администратор' : 'Сотрудник'}
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+7 (999) 123-45-67" />
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
                        <Input {...field} />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Зарплата (₽)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
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
                        <div>
                          <p className="font-medium">{entry.field_name}</p>
                          <p className="text-muted-foreground">
                            {entry.old_value} → {entry.new_value}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};