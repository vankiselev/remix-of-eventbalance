import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveGrid, ResponsiveCard, TextTruncate } from "@/components/ui/responsive-layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { Plus, Users, Shield, User, Edit, UserPlus, Search, Filter } from "lucide-react";
import { EmployeeProfileDialog } from "@/components/EmployeeProfileDialog";
import { formatDate } from '@/utils/dateFormat';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
}

interface Employee {
  id: string;
  user_id: string;
  position: string;
  salary: number | null;
  hire_date: string;
  profiles: Profile;
}

interface CombinedUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
  // Employee data (if exists)
  employee_id?: string;
  position?: string;
  salary?: number | null;
  hire_date?: string;
}

const Staff = () => {
  const [allUsers, setAllUsers] = useState<CombinedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CombinedUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CombinedUser | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "employee">("all");
  const [formData, setFormData] = useState({
    user_id: "",
    position: "",
    salary: "",
    hire_date: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get current user profile to check role
      const { data: currentProfile } = await supabase
        .rpc("get_user_basic_profile")
        .single();

      setCurrentUserProfile(currentProfile);

      // Fetch all profiles - admins see full data, employees see basic data only
      let profilesData;
      if (currentProfile?.role === "admin") {
        const { data, error: adminError } = await supabase.rpc("get_admin_profiles");
        if (adminError) {
          console.error("Error fetching admin profiles:", adminError);
          throw adminError;
        }
        profilesData = data;
      } else {
        // Non-admin users can see all basic profiles (without financial data)
        const { data, error: basicError } = await supabase.rpc("get_all_basic_profiles");
        if (basicError) {
          console.error("Error fetching basic profiles:", basicError);
          throw basicError;
        }
        profilesData = data;
      }

      setProfiles(profilesData || []);

      // Fetch employees data to get employment details
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          id,
          user_id,
          position,
          hire_date,
          created_at,
          updated_at
          ${currentProfile?.role === 'admin' ? ', salary' : ''}
        `)
        .order("hire_date", { ascending: false });

      if (employeesError) {
        console.error("Error fetching employees:", employeesError);
        throw employeesError;
      }

      // Create a map of employee data by user_id for quick lookup
      const employeeMap = new Map();
      (employeesData || []).forEach((emp: any) => {
        employeeMap.set(emp.user_id, {
          employee_id: emp.id,
          position: emp.position,
          salary: currentProfile?.role === 'admin' ? emp.salary : null,
          hire_date: emp.hire_date
        });
      });

      // Combine profiles with employee data
      const combinedUsers: CombinedUser[] = (profilesData || []).map((profile: Profile) => {
        const employeeData = employeeMap.get(profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          birth_date: profile.birth_date,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          ...employeeData
        };
      });

      setAllUsers(combinedUsers);
      setFilteredUsers(combinedUsers);
    } catch (error) {
      console.error("Error fetching staff data:", error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: "Не удалось загрузить данные о пользователях",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const employeeData = {
        user_id: formData.user_id,
        position: formData.position,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        hire_date: formData.hire_date,
      };

      const { error } = await supabase.from("employees").insert(employeeData);

      if (error) throw error;

      toast({
        title: t('success'),
        description: "Запись о сотруднике создана",
      });

      setFormData({
        user_id: "",
        position: "",
        salary: "",
        hire_date: "",
      });
      setShowCreateDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: error.message || "Не удалось создать запись о сотруднике",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(amount);
  };

  // Filter and search functionality
  useEffect(() => {
    let filtered = allUsers;

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.position && user.position.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, roleFilter, searchTerm]);

  const getRoleIcon = (role: string) => {
    return role === "admin" ? Shield : User;
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "Администратор" : "Сотрудник";
  };

  const getRoleColor = (role: string) => {
    return role === "admin" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const canViewSalary = (user: CombinedUser) => {
    // Only admins can see salaries - employees cannot see salary information even their own
    return currentUserProfile?.role === "admin";
  };

  const canManageStaff = () => {
    return currentUserProfile?.role === "admin";
  };

  const handleEditUser = (user: CombinedUser) => {
    // Check permissions - only admins can edit other admins
    if (user.role === 'admin' && currentUserProfile?.role !== 'admin') {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "У вас нет прав для редактирования администраторов",
      });
      return;
    }
    
    // Users can edit their own profile
    const canEditThisUser = user.id === currentUserProfile?.id || currentUserProfile?.role === 'admin';
    
    if (!canEditThisUser) {
      toast({
        variant: "destructive",
        title: "Ошибка", 
        description: "У вас нет прав для редактирования этого пользователя",
      });
      return;
    }

    setSelectedUser(user);
    setShowProfileDialog(true);
  };

  const handleProfileSuccess = async () => {
    // Принудительно обновляем все данные
    await fetchData();
    // Закрываем диалог и сбрасываем состояние
    setShowProfileDialog(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('staff')}</h1>
          <p className="text-muted-foreground">
            {canManageStaff() 
              ? "Управляйте командой и зарплатами" 
              : "Просмотр информации о пользователях"}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="bg-muted h-5 w-32 rounded"></div>
                <div className="bg-muted h-3 w-24 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="bg-muted h-3 w-full rounded"></div>
                  <div className="bg-muted h-3 w-3/4 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('staff')}</h1>
          <p className="text-muted-foreground">
            {canManageStaff() 
              ? "Управляйте командой и зарплатами" 
              : "Просмотр информации о пользователях"}
          </p>
        </div>
        {canManageStaff() && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить сотрудника
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить сотрудника</DialogTitle>
                <DialogDescription>
                  Создайте запись о сотруднике
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Пользователь</Label>
                  <Select 
                    value={formData.user_id} 
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name} ({profile.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Зарплата (₽)</Label>
                  <CurrencyInput
                    value={formData.salary ? Number(formData.salary) : undefined}
                    onChange={(value) => setFormData({ ...formData, salary: value?.toString() || "" })}
                    placeholder="Оставьте пустым, если не указываете"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Дата трудоустройства</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Добавить сотрудника
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск по имени, email или должности..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Фильтр по роли" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все пользователи</SelectItem>
            <SelectItem value="admin">Администраторы</SelectItem>
            <SelectItem value="employee">Сотрудники</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Найдено пользователей: {filteredUsers.length} из {allUsers.length}
        {roleFilter !== "all" && ` (фильтр: ${roleFilter === "admin" ? "Администраторы" : "Сотрудники"})`}
      </div>

      {filteredUsers.length === 0 ? (
        <ResponsiveCard className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || roleFilter !== "all" ? "Не найдено пользователей" : "Нет пользователей"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || roleFilter !== "all" 
              ? "Попробуйте изменить параметры поиска или фильтра"
              : "Пользователи не найдены"}
          </p>
        </ResponsiveCard>
      ) : (
        <ResponsiveGrid type="cards">
          {filteredUsers.map((user) => {
            const RoleIcon = getRoleIcon(user.role);
            return (
              <ResponsiveCard key={user.id} hover={true}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="avatar-responsive flex-shrink-0">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-tight">
                          <TextTruncate lines={2}>
                            {user.full_name}
                          </TextTruncate>
                        </CardTitle>
                        <CardDescription className="text-sm">
                          <TextTruncate>
                            {user.email}
                          </TextTruncate>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`${getRoleColor(user.role)} badge-responsive`}>
                        <RoleIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="text-truncate">{getRoleLabel(user.role)}</span>
                      </Badge>
                      {(canManageStaff() || user.id === currentUserProfile?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="p-1 h-8 w-8"
                          title={user.role === 'admin' ? 'Редактировать администратора' : 'Редактировать сотрудника'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.position && (
                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Должность:</span> 
                        <TextTruncate className="text-right max-w-[120px]">
                          {user.position}
                        </TextTruncate>
                      </div>
                    </div>
                  )}
                  {user.phone && (
                    <div className="text-sm">
                      <span className="font-medium">Телефон:</span> {user.phone}
                    </div>
                  )}
                  {canViewSalary(user) && user.salary && (
                    <div className="text-sm">
                      <span className="font-medium">Зарплата:</span>{" "}
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(user.salary)}
                      </span>
                    </div>
                  )}
                  {user.hire_date && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Дата найма:</span> {formatDate(user.hire_date)}
                    </div>
                  )}
                  {user.birth_date && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Дата рождения:</span> {formatDate(user.birth_date)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <span className="font-medium">В системе с:</span> {formatDate(user.created_at)}
                  </div>
                </CardContent>
              </ResponsiveCard>
            );
          })}
        </ResponsiveGrid>
      )}

      {selectedUser && (
        <EmployeeProfileDialog
          employee={selectedUser.employee_id ? {
            id: selectedUser.employee_id,
            user_id: selectedUser.id,
            position: selectedUser.position || '',
            salary: selectedUser.salary || null,
            hire_date: selectedUser.hire_date || '',
            profiles: {
              id: selectedUser.id,
              email: selectedUser.email,
              full_name: selectedUser.full_name,
              role: selectedUser.role,
              phone: selectedUser.phone,
              birth_date: selectedUser.birth_date,
              avatar_url: selectedUser.avatar_url,
              created_at: selectedUser.created_at
            }
          } : null}
          profile={!selectedUser.employee_id ? {
            id: selectedUser.id,
            email: selectedUser.email,
            full_name: selectedUser.full_name,
            role: selectedUser.role,
            phone: selectedUser.phone,
            birth_date: selectedUser.birth_date,
            avatar_url: selectedUser.avatar_url,
            created_at: selectedUser.created_at
          } : undefined}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onSuccess={handleProfileSuccess}
          isAdmin={canManageStaff()}
        />
      )}
    </div>
  );
};

export default Staff;