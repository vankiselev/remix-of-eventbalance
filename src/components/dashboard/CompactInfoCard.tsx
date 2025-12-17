import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, Plane, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface BirthdayEmployee {
  id: string;
  full_name: string;
  birth_date: string;
  avatar_url?: string;
}

interface Vacation {
  id: string;
  employee_name: string;
  vacation_type: string;
}

const getVacationTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    weekend: "Выходной",
    vacation: "Отпуск",
    sick: "Больничный",
    personal: "Личное",
    fun: "Кайфануть",
    study: "Учеба",
  };
  return labels[type] || type;
};

export const CompactInfoCard = () => {
  const [birthdayEmployees, setBirthdayEmployees] = useState<BirthdayEmployee[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch birthdays
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, avatar_url')
        .not('birth_date', 'is', null);

      const todayBirthdays = (profiles || []).filter(employee => {
        if (!employee.birth_date) return false;
        const birthDate = parseISO(employee.birth_date);
        const today = new Date();
        return birthDate.getMonth() === today.getMonth() && 
               birthDate.getDate() === today.getDate();
      });
      setBirthdayEmployees(todayBirthdays);

      // Fetch vacations
      const today = new Date().toISOString().split('T')[0];
      const { data: vacationsData } = await supabase
        .from("vacations")
        .select("id, employee_name, vacation_type")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("status", "approved");
      
      setVacations(vacationsData || []);
    } catch (error) {
      console.error('Error fetching compact info:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = parseISO(birthDate);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBirthdays = birthdayEmployees.length > 0;
  const hasVacations = vacations.length > 0;
  const hasData = hasBirthdays || hasVacations;

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-4">
        {/* Birthdays Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cake className={`w-4 h-4 ${hasBirthdays ? 'text-pink-500' : 'text-muted-foreground/50'}`} />
            <span className="text-sm font-medium">Именинники</span>
            {!hasBirthdays && (
              <span className="text-xs text-muted-foreground ml-auto">Нет</span>
            )}
          </div>
          {hasBirthdays && (
            <div className="space-y-2 ml-6">
              {birthdayEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-2">
                  {employee.avatar_url ? (
                    <img 
                      src={employee.avatar_url} 
                      alt={employee.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Users className="w-3 h-3 text-pink-500" />
                    </div>
                  )}
                  <span className="text-sm">{employee.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {calculateAge(employee.birth_date)} лет
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Vacations Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className={`w-4 h-4 ${hasVacations ? 'text-blue-500' : 'text-muted-foreground/50'}`} />
            <span className="text-sm font-medium">В отпуске</span>
            {!hasVacations && (
              <span className="text-xs text-muted-foreground ml-auto">Все на работе</span>
            )}
          </div>
          {hasVacations && (
            <div className="space-y-2 ml-6">
              {vacations.map((vacation) => (
                <div key={vacation.id} className="flex items-center gap-2">
                  <span className="text-sm">{vacation.employee_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getVacationTypeLabel(vacation.vacation_type)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state when both are empty */}
        {!hasData && (
          <div className="text-center text-muted-foreground text-sm py-2">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Сегодня всё спокойно
          </div>
        )}
      </CardContent>
    </Card>
  );
};
