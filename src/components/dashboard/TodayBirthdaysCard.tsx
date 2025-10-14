import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, parseISO } from "date-fns";

interface BirthdayEmployee {
  id: string;
  full_name: string;
  birth_date: string;
  avatar_url?: string;
  role: string;
}

const TodayBirthdaysCard = () => {
  const [birthdayEmployees, setBirthdayEmployees] = useState<BirthdayEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayBirthdays();
  }, []);

  const fetchTodayBirthdays = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, avatar_url, role')
        .not('birth_date', 'is', null);

      if (error) throw error;

      // Фильтруем сотрудников у которых сегодня день рождения
      const todayBirthdays = (data || []).filter(employee => {
        if (!employee.birth_date) return false;
        const birthDate = parseISO(employee.birth_date);
        const today = new Date();
        
        // Проверяем, совпадают ли месяц и день
        return birthDate.getMonth() === today.getMonth() && 
               birthDate.getDate() === today.getDate();
      });

      setBirthdayEmployees(todayBirthdays);
    } catch (error) {
      console.error('Error fetching today birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = parseISO(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    return age;
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-primary" />
            День рождения сегодня
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground py-4">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="w-5 h-5 text-primary" />
          День рождения сегодня 🎉
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {birthdayEmployees.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[180px]">
            <Cake className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Сегодня нет именинников</p>
          </div>
        ) : (
          <div className="space-y-3">
            {birthdayEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex-shrink-0">
                  {employee.avatar_url ? (
                    <img 
                      src={employee.avatar_url} 
                      alt={employee.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{employee.full_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {employee.role === 'admin' ? 'Администратор' : 'Сотрудник'} • {calculateAge(employee.birth_date)} лет
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Cake className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayBirthdaysCard;