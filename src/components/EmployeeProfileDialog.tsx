import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PhoneInputRU } from "@/components/ui/phone-input-ru";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { useRoles } from "@/hooks/useRoles";
import { Upload, ChevronDown, History, UserX, Trash2, UserCheck, X, ImageIcon, Crop } from "lucide-react";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { RoleBadges } from "@/components/roles/RoleBadge";
import { AvatarCropper } from "@/components/ui/avatar-cropper";
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
  last_name: z.string().trim().min(1, "Фамилия обязательна").max(100, "Фамилия не может быть длиннее 100 символов"),
  first_name: z.string().trim().min(1, "Имя обязательно").max(100, "Имя не может быть длиннее 100 символов"),
  middle_name: z.string().trim().max(100, "Отчество не может быть длиннее 100 символов").optional(),
  email: z.string().trim().email("Некорректный email").max(255, "Email не может быть длиннее 255 символов"),
  phone_display: z.string().optional(),
  phone_e164: z.string().optional(),
  work_phone: z.string().trim().max(50, "Телефон не может быть длиннее 50 символов").optional(),
  birth_date: z.string().optional(),
  position: z.string().trim().max(200, "Должность не может быть длиннее 200 символов").optional(),
  hire_date: z.string().optional(),
  salary: z.string().optional(),
  role_id: z.string().optional(),
  notes: z.string().trim().max(1000, "Примечания не могут быть длиннее 1000 символов").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Employee {
  id: string;
  user_id: string;
  position: string;
  salary: number | null;
  hire_date: string;
  phone?: string | null;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    last_name?: string;
    first_name?: string;
    middle_name?: string;
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
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  phone?: string;
  phone_e164?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
  employment_status?: string;
  termination_date?: string;
  termination_reason?: string;
}

interface RoleAssignment {
  role_id: string;
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
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [userRoleAssignments, setUserRoleAssignments] = useState<RoleAssignment[]>([]);
  // Store original values for change tracking
  const [originalValues, setOriginalValues] = useState<ProfileFormData | null>(null);
  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const { isAdmin: canEditRole } = useUserRbacRoles();
  const { roles } = useRoles();
  const queryClient = useQueryClient();

  // Get the current user data (either from employee or profile)
  const currentUser = employee ? employee.profiles : profile;
  const currentUserId = currentUser?.id;
  const { roles: rbacRoles, refetch: refetchRoles } = useUserRbacRoles(currentUser?.id);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      last_name: "",
      first_name: "",
      middle_name: "",
      email: "",
      phone_display: "",
      phone_e164: "",
      work_phone: "",
      birth_date: "",
      position: "",
      hire_date: "",
      salary: "",
      role_id: "",
      notes: "",
    },
  });

  useEffect(() => {
    if ((employee || profile) && isOpen) {
      const userData = currentUser;
      if (!userData) return;

      // Initialize form with known data first
      const initializeForm = async () => {
        // Always fetch the full profile (staff list/joins may not include split name fields)
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('id,email,full_name,first_name,last_name,middle_name,phone,phone_e164,birth_date')
          .eq('id', userData.id)
          .maybeSingle();

        const profileSource = fullProfile ?? userData;

        let empData: { position?: string; hire_date?: string; salary?: number; phone?: string } | null = null;
        
        // Fetch employee data if not provided
        if (!employee && userData) {
          const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', userData.id)
            .maybeSingle();
          empData = data;
        }

        // Fetch user role assignments
        const { data: roleData } = await supabase
          .from('user_role_assignments')
          .select('role_id')
          .eq('user_id', userData.id);
        
        if (roleData && roleData.length > 0) {
          setUserRoleAssignments(roleData);
        }

        // Build initial values object
        const initialValues: ProfileFormData = {
          last_name: (profileSource as any).last_name || "",
          first_name: (profileSource as any).first_name || "",
          middle_name: (profileSource as any).middle_name || "",
          email: (profileSource as any).email || userData.email,
          phone_display: (profileSource as any).phone || "",
          phone_e164: (profileSource as any).phone_e164 || "",
          work_phone: employee?.phone || empData?.phone || "",
          birth_date: (profileSource as any).birth_date || "",
          position: employee?.position || empData?.position || "",
          hire_date: employee?.hire_date || empData?.hire_date || "",
          salary: employee?.salary?.toString() || empData?.salary?.toString() || "",
          role_id: roleData?.[0]?.role_id || "",
          notes: "",
        };

        // Store original values for change tracking
        setOriginalValues(initialValues);
        
        // Now reset form with all available data
        form.reset(initialValues);
      };

      initializeForm();
      fetchEditHistory();
    }
  }, [employee, profile, isOpen, form, currentUserId]);

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

  // Handle file selection - open cropper instead of direct upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setCropperOpen(true);
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  // Handle cropped image upload
  const handleCroppedImageUpload = async (croppedBlob: Blob) => {
    if (!currentUser) return;

    setUploading(true);
    try {
      const fileName = `${currentUser.id}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

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

      await logFieldChange("avatar_url", currentUser.avatar_url, avatarUrl);

      toast.success("Успешно!", {
        description: "Фото профиля обновлено",
      });
      
      setShowAvatarDialog(false);
      setSelectedFile(null);
      onSuccess();
    } catch (error: any) {
        toast.error("Ошибка", {
          description: error.message || "Не удалось загрузить фото",
        });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentUser) return;

    try {
      setUploading(true);

      // Delete avatar file from storage
      const fileName = `${currentUser.id}.jpg`;
      const filePath = `avatars/${fileName}`;
      
      await supabase.storage
        .from('avatars')
        .remove([filePath]);

      // Clear avatar_url in profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      await logFieldChange("avatar_url", currentUser.avatar_url, null);

      toast.success("Успешно!", {
        description: "Фото профиля удалено",
      });
      
      setShowAvatarDialog(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Не удалось удалить фото",
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
        last_name: data.last_name?.trim(),
        first_name: data.first_name?.trim(),
        middle_name: data.middle_name?.trim() || null,
        full_name: [data.last_name?.trim(), data.first_name?.trim(), data.middle_name?.trim()].filter(Boolean).join(' '),
        phone: data.phone_display || null,
        phone_e164: data.phone_e164 || null,
        birth_date: data.birth_date || null,
      };

      // Only admin can update email
      if (isAdmin) {
        profileUpdates.email = data.email;
      }

      // Only admin can change role
      if (canEditRole && data.role_id && data.role_id !== userRoleAssignments[0]?.role_id) {
        // Prevent changing own role
        if (currentUser.id === user?.id) {
          toast.error('Невозможно изменить собственную роль');
          setLoading(false);
          return;
        }

        console.log('Attempting to change role:', {
          currentUserId: currentUser.id,
          oldRoleId: userRoleAssignments[0]?.role_id,
          newRoleId: data.role_id,
          assignedBy: user?.id
        });

        // Remove old role assignment
        const { error: deleteError } = await supabase
          .from('user_role_assignments')
          .delete()
          .eq('user_id', currentUser.id);

        if (deleteError) {
          console.error('Error deleting old role:', deleteError);
          throw new Error(`Не удалось удалить старую роль: ${deleteError.message}`);
        }
        
        // Add new role assignment
        const { data: insertedRole, error: insertError } = await supabase
          .from('user_role_assignments')
          .insert({
            user_id: currentUser.id,
            role_id: data.role_id,
            assigned_by: user?.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting new role:', insertError);
          throw new Error(`Не удалось назначить новую роль: ${insertError.message}`);
        }

        console.log('[RoleAssignment] Role successfully changed:', insertedRole);
        console.log('[RoleAssignment] Old assignments:', userRoleAssignments);
        
        const oldRole = roles.find(r => r.id === userRoleAssignments[0]?.role_id)?.name || 'неизвестно';
        const newRole = roles.find(r => r.id === data.role_id)?.name || 'неизвестно';
        console.log('[RoleAssignment] Old role:', oldRole, 'New role:', newRole);
        await logFieldChange("role", oldRole, newRole);

        console.log('[RoleAssignment] Forcing refetch for user:', currentUser.id);
        
        // Use refetchQueries instead of invalidateQueries for immediate update
        await queryClient.refetchQueries({ queryKey: ['user-rbac-roles', currentUser.id] });
        await queryClient.refetchQueries({ queryKey: ['user-permissions'] });
        await queryClient.refetchQueries({ queryKey: ['user-role-assignments', currentUser.id] });
        
        console.log('[RoleAssignment] Refetch queries complete');
        
        // Force immediate refetch of the roles hook
        await refetchRoles();
        console.log('[RoleAssignment] Roles refetched');
        
        // Longer delay to ensure UI updates propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[RoleAssignment] UI should be updated now');

        toast.success(`Роль изменена: ${oldRole} → ${newRole}`, {
          description: currentUser.full_name || currentUser.email,
        });
      }

      // Log changes for profile using stored original values
      if (originalValues) {
        if (data.last_name !== originalValues.last_name) {
          await logFieldChange("last_name", originalValues.last_name, data.last_name);
        }
        if (data.first_name !== originalValues.first_name) {
          await logFieldChange("first_name", originalValues.first_name, data.first_name);
        }
        if ((data.middle_name || "") !== (originalValues.middle_name || "")) {
          await logFieldChange("middle_name", originalValues.middle_name || "", data.middle_name || "");
        }
        if (data.phone_display !== originalValues.phone_display) {
          await logFieldChange("phone", originalValues.phone_display, data.phone_display);
        }
        if (data.birth_date !== originalValues.birth_date) {
          await logFieldChange("birth_date", originalValues.birth_date, data.birth_date);
        }
        if (isAdmin && data.email !== originalValues.email) {
          await logFieldChange("email", originalValues.email, data.email);
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // Handle employee data - create or update
      if (data.position || data.hire_date || data.work_phone || (isAdmin && data.salary)) {
        const employeeUpdates: any = {
          position: data.position || "",
          hire_date: data.hire_date || new Date().toISOString().split('T')[0],
          phone: data.work_phone || null,
        };

        if (isAdmin) {
          employeeUpdates.salary = data.salary ? parseFloat(data.salary) : null;
        }

        if (employee) {
          // Update existing employee record - use originalValues for comparison
          if (originalValues && data.position !== originalValues.position) {
            await logFieldChange("position", originalValues.position, data.position);
          }
          if (originalValues && data.hire_date !== originalValues.hire_date) {
            await logFieldChange("hire_date", originalValues.hire_date, data.hire_date);
          }
          if (originalValues && data.work_phone !== originalValues.work_phone) {
            await logFieldChange("work_phone", originalValues.work_phone, data.work_phone);
          }
          if (originalValues && isAdmin && data.salary !== originalValues.salary) {
            await logFieldChange("salary", originalValues.salary, data.salary);
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
          if (data.work_phone) await logFieldChange("work_phone", null, data.work_phone);
          if (isAdmin && data.salary) await logFieldChange("salary", null, data.salary);
        }
      }

      toast.success("Успешно!", {
        description: "Изменения сохранены",
      });

      // Refresh the edit history and data immediately
      await fetchEditHistory();
      
      // Вызываем onSuccess для обновления списка и закрываем диалог
      onSuccess();
    } catch (error: any) {
      toast.error("Ошибка", {
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
      'last_name': 'Фамилия',
      'first_name': 'Имя',
      'middle_name': 'Отчество',
      'full_name': 'ФИО',
      'email': 'Email',
      'phone': 'Телефон',
      'work_phone': 'Рабочий телефон',
      'birth_date': 'Дата рождения',
      'position': 'Должность',
      'hire_date': 'Дата найма',
      'salary': 'Оклад',
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

      toast.success("Сотрудник уволен", {
        description: "Доступ к системе заблокирован. Все записи сохранены.",
      });

      setShowTerminateDialog(false);
      setTerminationReason("");
      onSuccess(true); // Передаем флаг что был уволен
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка", {
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

      toast.success("Сотрудник восстановлен", {
        description: "Доступ к системе возобновлен.",
      });

      setShowReactivateDialog(false);
      onSuccess(false); // Передаем флаг что не уволен
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка", {
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
        p_employee_user_id: currentUser.id
      });

      if (error) throw error;

      toast.success("Сотрудник удален", {
        description: "Все данные сотрудника безвозвратно удалены из системы.",
      });

      setShowDeleteDialog(false);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка", {
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
            Профиль пользователя
          </DialogTitle>
          <DialogDescription>
            Просмотр и редактирование информации о пользователе
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {/* Click to open avatar dialog */}
              <button
                type="button"
                onClick={() => setShowAvatarDialog(true)}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              >
                <Avatar className="w-20 h-20">
                  <AvatarImage src={currentUser.avatar_url} />
                  <AvatarFallback>
                    {currentUser.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="text-white text-center">
                    <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Просмотр</span>
                  </div>
                </div>
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{currentUser.full_name}</h3>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <div className="mt-2">
                <RoleBadges roles={rbacRoles} />
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите имя" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите фамилию" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middle_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отчество</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите отчество" />
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
                  name="work_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Рабочий телефон</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="+7 (999) 123-45-67" 
                          className="placeholder:text-muted-foreground/50"
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
                        <Input 
                          {...field} 
                          placeholder="Введите должность"
                          disabled={!isAdmin}
                        />
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
                    name="role_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Роль</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(isAdmin || currentUser.id === user?.id) && (
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Оклад (₽)</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(value) => field.onChange(value?.toString() || "")}
                            placeholder="Введите зарплату"
                            disabled={!isAdmin}
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

      {/* Avatar View/Edit Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Фото профиля</DialogTitle>
            <DialogDescription>
              Просмотр и управление фото профиля
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-64 h-64 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                  <p>Фото не загружено</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => document.getElementById('avatar-upload-dialog')?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {currentUser?.avatar_url ? 'Заменить' : 'Загрузить'}
            </Button>
            
            {currentUser?.avatar_url && (
              <Button
                variant="destructive"
                onClick={handleDeleteAvatar}
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            )}
          </div>
          
          <input
            id="avatar-upload-dialog"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </DialogContent>
      </Dialog>

      {/* Avatar Cropper Dialog */}
      <AvatarCropper
        open={cropperOpen}
        onOpenChange={(open) => {
          setCropperOpen(open);
          if (!open) setSelectedFile(null);
        }}
        imageFile={selectedFile}
        onCropComplete={handleCroppedImageUpload}
      />
    </Dialog>
  );
};