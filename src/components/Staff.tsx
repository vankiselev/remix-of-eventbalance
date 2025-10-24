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
import { Plus, Users, User, Edit, UserPlus, Search, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeProfileDialog } from "@/components/EmployeeProfileDialog";
import { formatDate } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/formatCurrency';
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { UserRoleDisplay } from "@/components/roles/UserRoleDisplay";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
  employment_status?: string;
  termination_date?: string;
  termination_reason?: string;
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
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  created_at: string;
  employment_status?: string;
  termination_date?: string;
  termination_reason?: string;
  // Employee data (if exists)
  employee_id?: string;
  position?: string;
  salary?: number | null;
  hire_date?: string;
  // Cash on hand
  total_cash?: number;
  cash_nastya?: number;
  cash_lera?: number;
  cash_vanya?: number;
}

const Staff = () => {
  const { hasPermission } = useUserPermissions();
  const { isAdmin } = useUserRbacRoles();
  const [allUsers, setAllUsers] = useState<CombinedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CombinedUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CombinedUser | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "terminated">("active");
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
      // Get current user profile
      const { data: currentProfile } = await supabase
        .rpc("get_user_basic_profile")
        .single();

      setCurrentUserProfile(currentProfile);

      // Fetch all profiles - admins see full data, employees see basic data only
      let profilesData;
      if (isAdmin) {
        const { data, error: adminError } = await supabase.rpc("get_admin_profiles");
        if (adminError) {
          console.error("Error fetching admin profiles:", adminError);
          throw adminError;
        }
        profilesData = data;
      } else {
        // Non-admin users can see all basic profiles (active only)
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
          ${isAdmin ? ', salary' : ''}
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
          salary: isAdmin ? emp.salary : null,
          hire_date: emp.hire_date
        });
      });

      // Fetch cash data for all users if admin
      const cashDataMap = new Map();
      if (isAdmin) {
        const cashPromises = (profilesData || []).map(async (profile: Profile) => {
          const { data } = await supabase
            .rpc('calculate_user_cash_totals', { user_uuid: profile.id })
            .maybeSingle();
          return { userId: profile.id, cashData: data };
        });
        const cashResults = await Promise.all(cashPromises);
        cashResults.forEach(result => {
          if (result.cashData) {
            cashDataMap.set(result.userId, result.cashData);
          }
        });
      }

      // Combine profiles with employee data and cash data
      const combinedUsers: CombinedUser[] = (profilesData || []).map((profile: Profile) => {
        const employeeData = employeeMap.get(profile.id);
        const cashData = cashDataMap.get(profile.id);
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          birth_date: profile.birth_date,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          employment_status: profile.employment_status,
          termination_date: profile.termination_date,
          termination_reason: profile.termination_reason,
          ...employeeData,
          ...(cashData && {
            total_cash: cashData.total_cash,
            cash_nastya: cashData.cash_nastya,
            cash_lera: cashData.cash_lera,
            cash_vanya: cashData.cash_vanya
          })
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

  // Filter and search functionality
  useEffect(() => {
    let filtered = allUsers;

    // Apply employment status filter
    filtered = filtered.filter(user => {
      const isTerminated = user.employment_status === 'terminated';
      return statusTab === 'terminated' ? isTerminated : !isTerminated;
    });

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
  }, [allUsers, searchTerm, statusTab]);


  const handleEditUser = (user: CombinedUser) => {
    // Users can edit their own profile or admins can edit anyone
    const canEditThisUser = user.id === currentUserProfile?.id || isAdmin;
    
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

  const handleProfileSuccess = async (wasTerminated?: boolean) => {
    // Принудительно обновляем все данные
    await fetchData();
    // Переключаем вкладку в зависимости от действия
    if (wasTerminated === true) {
      setStatusTab('terminated'); // Переключаем на "Уволенные"
    } else if (wasTerminated === false) {
      setStatusTab('active'); // Переключаем на "Активные"
    }
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
            {hasPermission('staff.manage')
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
    <div className="space-y-6 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">{t('staff')}</h1>
          <p className="text-muted-foreground truncate">
            {hasPermission('staff.manage')
              ? "Управляйте командой и зарплатами" 
              : "Просмотр информации о пользователях"}
          </p>
        </div>
        {hasPermission('staff.manage') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto flex-shrink-0">
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

      {/* Tabs for Active/Terminated */}
      <Tabs value={statusTab} onValueChange={(value: any) => setStatusTab(value)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            Активные сотрудники
          </TabsTrigger>
          <TabsTrigger value="terminated">
            Уволенные
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="space-y-4">
          {/* Search Controls */}
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
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Найдено пользователей: {filteredUsers.length}
          </div>

          {filteredUsers.length === 0 ? (
            <ResponsiveCard className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Не найдено пользователей" : "Нет пользователей"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Попробуйте изменить параметры поиска"
                  : statusTab === "terminated" ? "Нет уволенных сотрудников" : "Нет активных сотрудников"}
              </p>
            </ResponsiveCard>
          ) : (
            <ResponsiveGrid type="cards">
              {filteredUsers.map((user) => {
                const isTerminated = user.employment_status === 'terminated';
                
                return (
                  <ResponsiveCard key={user.id} hover={true} className={isTerminated ? 'opacity-75' : ''}>
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
                      <div className="flex flex-col gap-1 items-end">
                        <UserRoleDisplay userId={user.id} />
                        {user.employment_status === 'terminated' && (
                          <Badge variant="destructive" className="badge-responsive">
                            <span className="text-truncate">Уволен</span>
                          </Badge>
                        )}
                      </div>
                      {(hasPermission('staff.edit_all') || user.id === currentUserProfile?.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="p-1 h-8 w-8"
                            title="Редактировать профиль"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                      )}
                    </div>
                  </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {user.position && (
                        <div className="text-sm">
                          <span className="font-medium">Должность: </span>
                          <span>{user.position}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="text-sm">
                          <span className="font-medium">Телефон:</span> {user.phone}
                        </div>
                      )}
                      {hasPermission('staff.view_all') && user.salary && (
                        <div className="text-sm">
                          <span className="font-medium">Зарплата:</span>{" "}
                          <span>{formatCurrency(user.salary)}</span>
                        </div>
                      )}
                      {user.hire_date && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Дата найма:</span> {formatDate(user.hire_date)}
                        </div>
                      )}
                      {isTerminated && user.termination_date && (
                        <div className="text-sm text-destructive">
                          <span className="font-medium">Дата увольнения:</span> {formatDate(user.termination_date)}
                        </div>
                      )}
                      {isTerminated && user.termination_reason && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Причина:</span> {user.termination_reason}
                        </div>
                      )}
                      {user.birth_date && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Дата рождения:</span> {formatDate(user.birth_date)}
                        </div>
                      )}
                      
                      {/* Cash on hand summary */}
                      {hasPermission('staff.view_all') && user.total_cash !== undefined && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="text-sm font-semibold text-center">
                            Деньги на руках: {" "}
                            <span className={user.total_cash >= 0 ? "text-green-600" : "text-red-600"}>
                              {formatCurrency(user.total_cash)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-1.5 rounded bg-muted/50">
                              <div className="text-muted-foreground">Настя</div>
                              <div className="font-medium">{formatCurrency(user.cash_nastya || 0)}</div>
                            </div>
                            <div className="text-center p-1.5 rounded bg-muted/50">
                              <div className="text-muted-foreground">Лера</div>
                              <div className="font-medium">{formatCurrency(user.cash_lera || 0)}</div>
                            </div>
                            <div className="text-center p-1.5 rounded bg-muted/50">
                              <div className="text-muted-foreground">Ваня</div>
                              <div className="font-medium">{formatCurrency(user.cash_vanya || 0)}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </ResponsiveCard>
                );
              })}
            </ResponsiveGrid>
          )}
        </TabsContent>
      </Tabs>

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
              phone: selectedUser.phone,
              birth_date: selectedUser.birth_date,
              avatar_url: selectedUser.avatar_url,
              created_at: selectedUser.created_at,
              employment_status: selectedUser.employment_status,
              termination_date: selectedUser.termination_date,
              termination_reason: selectedUser.termination_reason
            }
          } : null}
          profile={!selectedUser.employee_id ? {
            id: selectedUser.id,
            email: selectedUser.email,
            full_name: selectedUser.full_name,
            phone: selectedUser.phone,
            birth_date: selectedUser.birth_date,
            avatar_url: selectedUser.avatar_url,
            created_at: selectedUser.created_at,
            employment_status: selectedUser.employment_status,
            termination_date: selectedUser.termination_date,
            termination_reason: selectedUser.termination_reason
          } : undefined}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onSuccess={handleProfileSuccess}
          isAdmin={hasPermission('staff.manage')}
        />
      )}
    </div>
  );
};

export default Staff;