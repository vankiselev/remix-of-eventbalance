import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Cake, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, isThisMonth, parseISO, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { RoleBadges } from "@/components/roles/RoleBadge";

interface EmployeeBirthday {
  id: string;
  full_name: string;
  birth_date: string;
  avatar_url?: string;
  role: string;
}

const Birthdays = () => {
  const [employees, setEmployees] = useState<EmployeeBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeBirthdays();
  }, []);

  const fetchEmployeeBirthdays = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, avatar_url, role')
        .not('birth_date', 'is', null)
        .order('birth_date', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employee birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return employees
      .map(employee => {
        const birthDate = parseISO(employee.birth_date);
        const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
        
        // Если день рождения уже прошел в этом году, используем дату следующего года
        const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
        
        return {
          ...employee,
          upcomingBirthday,
          age: currentYear - birthDate.getFullYear() + (thisYearBirthday < today ? 1 : 0)
        };
      })
      .sort((a, b) => a.upcomingBirthday.getTime() - b.upcomingBirthday.getTime());
  };

  const getTodayBirthdays = () => {
    return getUpcomingBirthdays().filter(employee => 
      isToday(employee.upcomingBirthday)
    );
  };

  const getTomorrowBirthdays = () => {
    return getUpcomingBirthdays().filter(employee => 
      isTomorrow(employee.upcomingBirthday)
    );
  };

  const getThisMonthBirthdays = () => {
    return getUpcomingBirthdays().filter(employee => 
      isThisMonth(employee.upcomingBirthday) && 
      !isToday(employee.upcomingBirthday) && 
      !isTomorrow(employee.upcomingBirthday)
    );
  };

  const getUpcomingMonthsBirthdays = () => {
    return getUpcomingBirthdays().filter(employee => 
      !isThisMonth(employee.upcomingBirthday)
    ).slice(0, 10); // Показываем первые 10 предстоящих
  };

  const getBirthdayBadgeVariant = (upcomingBirthday: Date) => {
    if (isToday(upcomingBirthday)) return "default";
    if (isTomorrow(upcomingBirthday)) return "secondary";
    if (isThisMonth(upcomingBirthday)) return "outline";
    return "outline";
  };

  const formatBirthdayDate = (upcomingBirthday: Date) => {
    if (isToday(upcomingBirthday)) return "Сегодня";
    if (isTomorrow(upcomingBirthday)) return "Завтра";
    return format(upcomingBirthday, "dd MMMM", { locale: ru });
  };

  const EmployeeCard = ({ employee, upcomingBirthday, age }: any) => {
    const { roles } = useUserRbacRoles(employee.id);
    
    return (
      <div className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex-shrink-0">
          {employee.avatar_url ? (
            <img 
              src={employee.avatar_url} 
              alt={employee.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{employee.full_name}</h3>
          <div className="mt-1">
            <RoleBadges roles={roles} />
          </div>
        </div>
        <div className="text-right">
          <Badge variant={getBirthdayBadgeVariant(upcomingBirthday)} className="mb-1">
            {formatBirthdayDate(upcomingBirthday)}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {age} {age % 10 === 1 && age !== 11 ? 'год' : 
             age % 10 >= 2 && age % 10 <= 4 && (age < 10 || age > 20) ? 'года' : 'лет'}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка дней рождения...</p>
        </div>
      </div>
    );
  }

  const todayBirthdays = getTodayBirthdays();
  const tomorrowBirthdays = getTomorrowBirthdays();
  const thisMonthBirthdays = getThisMonthBirthdays();
  const upcomingBirthdays = getUpcomingMonthsBirthdays();

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Cake className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">Дни рождения сотрудников</h1>
          <p className="text-muted-foreground truncate">Не забудьте поздравить коллег!</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Нет данных о днях рождения</h3>
            <p className="text-muted-foreground text-center">
              У сотрудников не указаны даты рождения в профилях
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Сегодня */}
          {todayBirthdays.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cake className="w-5 h-5 text-primary" />
                  День рождения сегодня! 🎉
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayBirthdays.map((employee) => (
                  <EmployeeCard 
                    key={employee.id} 
                    employee={employee} 
                    upcomingBirthday={employee.upcomingBirthday}
                    age={employee.age}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Завтра */}
          {tomorrowBirthdays.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Завтра день рождения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tomorrowBirthdays.map((employee) => (
                  <EmployeeCard 
                    key={employee.id} 
                    employee={employee} 
                    upcomingBirthday={employee.upcomingBirthday}
                    age={employee.age}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* В этом месяце */}
          {thisMonthBirthdays.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  В этом месяце
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {thisMonthBirthdays.map((employee) => (
                  <EmployeeCard 
                    key={employee.id} 
                    employee={employee} 
                    upcomingBirthday={employee.upcomingBirthday}
                    age={employee.age}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Предстоящие */}
          {upcomingBirthdays.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Предстоящие дни рождения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingBirthdays.map((employee) => (
                  <EmployeeCard 
                    key={employee.id} 
                    employee={employee} 
                    upcomingBirthday={employee.upcomingBirthday}
                    age={employee.age}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Birthdays;