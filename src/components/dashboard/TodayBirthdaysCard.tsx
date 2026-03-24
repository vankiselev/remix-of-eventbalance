import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, isSameWeek, format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatDisplayName } from "@/utils/formatName";
import { useQuery } from "@tanstack/react-query";

interface BirthdayEmployee {
  id: string;
  full_name: string;
  birth_date: string;
  avatar_url?: string;
}

function matchesMonthDay(birthDate: string, refDate: Date): boolean {
  const bd = parseISO(birthDate);
  return bd.getMonth() === refDate.getMonth() && bd.getDate() === refDate.getDate();
}

function isThisWeekBirthday(birthDate: string): boolean {
  const bd = parseISO(birthDate);
  const now = new Date();
  const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  return isSameWeek(thisYearBd, now, { weekStartsOn: 1 }) && !matchesMonthDay(birthDate, now);
}

const TodayBirthdaysCard = () => {
  const { data: birthdayData, isLoading: loading } = useQuery({
    queryKey: ['birthdays-widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, avatar_url')
        .not('birth_date', 'is', null);

      if (error) throw error;

      const today: BirthdayEmployee[] = [];
      const week: BirthdayEmployee[] = [];
      const now = new Date();

      (data || []).forEach(emp => {
        if (!emp.birth_date) return;
        if (matchesMonthDay(emp.birth_date, now)) {
          today.push(emp);
        } else if (isThisWeekBirthday(emp.birth_date)) {
          week.push(emp);
        }
      });

      return { today, week };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const todayBirthdays = birthdayData?.today || [];
  const weekBirthdays = birthdayData?.week || [];

  const calculateAge = (birthDate: string) => {
    const birth = parseISO(birthDate);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  };

  const formatBirthday = (birthDate: string) => {
    const bd = parseISO(birthDate);
    const now = new Date();
    const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    return format(thisYearBd, "d MMMM", { locale: ru });
  };

  const BirthdayItem = ({ employee, showDate }: { employee: BirthdayEmployee; showDate?: boolean }) => (
    <div className="flex items-center space-x-2.5 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="flex-shrink-0">
        {employee.avatar_url ? (
          <img
            src={employee.avatar_url}
            alt={formatDisplayName(employee.full_name)}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-[13px] sm:text-sm truncate">{formatDisplayName(employee.full_name)}</h4>
        <p className="text-[11px] sm:text-xs text-muted-foreground">
          {showDate ? `${formatBirthday(employee.birth_date)} · ` : ""}
          {calculateAge(employee.birth_date)} лет
        </p>
      </div>
      <Cake className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
    </div>
  );

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Cake className="w-5 h-5 text-primary" />
            Именинники
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground py-4">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  const hasAny = todayBirthdays.length > 0 || weekBirthdays.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="flex items-center gap-2 justify-center text-sm sm:text-base">
          <Cake className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Именинники
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-3 sm:px-6">
        {!hasAny ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[120px] sm:min-h-[180px]">
            <Cake className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
            <p className="text-sm">На этой неделе нет именинников</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayBirthdays.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">🎂 Сегодня</p>
                {todayBirthdays.map(emp => (
                  <BirthdayItem key={emp.id} employee={emp} />
                ))}
              </div>
            )}
            {weekBirthdays.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">На этой неделе</p>
                {weekBirthdays.map(emp => (
                  <BirthdayItem key={emp.id} employee={emp} showDate />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayBirthdaysCard;
