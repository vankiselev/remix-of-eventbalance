import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Shield, User, Edit, UserPlus } from "lucide-react";
import { EmployeeProfileDialog } from "@/components/EmployeeProfileDialog";

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

const Staff = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    position: "",
    salary: "",
    hire_date: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get current user profile to check role
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUserProfile(currentProfile);

      // Fetch all profiles (including invited users) based on employees or invitations
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      setProfiles(profilesData || []);

       // Fetch employees with their profiles
       // For security: only fetch salary data if user is admin
       const { data: employeesData, error } = await supabase
         .from("employees")
         .select(`
           id,
           user_id,
           position,
           hire_date,
           created_at,
           updated_at,
           ${currentProfile?.role === 'admin' ? 'salary,' : ''}
           profiles!inner(
             id,
             email,
             full_name,
             role,
             phone,
             birth_date,
             avatar_url,
             created_at
           )
         `)
         .order("hire_date", { ascending: false });

       if (error) throw error;
       
       // Map the data to ensure salary is null for non-admin users
       const processedData = (employeesData || []).map((emp: any) => ({
         ...emp,
         salary: currentProfile?.role === 'admin' ? emp.salary : null
       }));
       
       setEmployees(processedData);
    } catch (error) {
      console.error("Error fetching staff data:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные о сотрудниках",
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
        title: "Успешно!",
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
        title: "Ошибка",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? Shield : User;
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "Администратор" : "Сотрудник";
  };

  const getRoleColor = (role: string) => {
    return role === "admin" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const canViewSalary = (employee: Employee) => {
    // Only admins can see salaries - employees cannot see salary information even their own
    return currentUserProfile?.role === "admin";
  };

  const canManageStaff = () => {
    return currentUserProfile?.role === "admin";
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowProfileDialog(true);
  };

  const handleProfileSuccess = () => {
    fetchData();
    setShowProfileDialog(false);
    setSelectedEmployee(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Сотрудники</h1>
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
          <h1 className="text-3xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">
            {canManageStaff() 
              ? "Управляйте командой и зарплатами" 
              : "Просмотр информации о сотрудниках"}
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
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет записей о сотрудниках</h3>
            <p className="text-muted-foreground text-center mb-4">
              {canManageStaff() 
                ? "Добавьте первую запись о сотруднике" 
                : "Записи о сотрудниках пока не созданы"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const RoleIcon = getRoleIcon(employee.profiles.role);
            return (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={employee.profiles.avatar_url} />
                        <AvatarFallback>
                          {employee.profiles.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="line-clamp-2 text-base">
                          {employee.profiles.full_name}
                        </CardTitle>
                        <CardDescription className="text-sm">{employee.profiles.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getRoleColor(employee.profiles.role)}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {getRoleLabel(employee.profiles.role)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Должность:</span> {employee.position}
                  </div>
                  {employee.profiles.phone && (
                    <div className="text-sm">
                      <span className="font-medium">Телефон:</span> {employee.profiles.phone}
                    </div>
                  )}
                  {canViewSalary(employee) && employee.salary && (
                    <div className="text-sm">
                      <span className="font-medium">Зарплата:</span>{" "}
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(employee.salary)}
                      </span>
                    </div>
                  )}
                  {!canViewSalary(employee) && employee.salary && (
                    <div className="text-sm">
                      <span className="font-medium">Зарплата:</span>{" "}
                      <span className="text-muted-foreground">Скрыто</span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Дата найма:</span> {formatDate(employee.hire_date)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">В системе с:</span> {formatDate(employee.profiles.created_at)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmployeeProfileDialog
        employee={selectedEmployee}
        isOpen={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onSuccess={handleProfileSuccess}
        isAdmin={canManageStaff()}
      />
    </div>
  );
};

export default Staff;