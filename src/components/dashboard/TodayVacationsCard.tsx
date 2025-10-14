import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Vacation {
  id: string;
  employee_name: string;
  vacation_type: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

const TodayVacationsCard = () => {
  const [todayVacations, setTodayVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayVacations();
  }, []);

  const fetchTodayVacations = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("vacations")
        .select("id, employee_name, vacation_type, description, start_date, end_date")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("status", "approved");

      if (error) throw error;
      setTodayVacations(data || []);
    } catch (error) {
      console.error("Error fetching today's vacations:", error);
      setTodayVacations([]);
    } finally {
      setLoading(false);
    }
  };

  const getVacationTypeLabel = (type: string) => {
    switch (type) {
      case "weekend":
        return "Выходной";
      case "vacation":
        return "Отпуск";
      case "sick":
        return "Больничный";
      case "personal":
        return "Личное";
      case "fun":
        return "Кайфануть";
      case "study":
        return "Учеба";
      default:
        return type;
    }
  };

  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case "weekend":
        return "bg-purple-100 text-purple-800";
      case "vacation":
        return "bg-green-100 text-green-800";
      case "sick":
        return "bg-red-100 text-red-800";
      case "personal":
        return "bg-blue-100 text-blue-800";
      case "fun":
        return "bg-orange-100 text-orange-800";
      case "study":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Если даты в одном месяце
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, "d", { locale: ru })}-${format(end, "d MMMM", { locale: ru })}`;
    }
    
    return `${format(start, "d MMM", { locale: ru })} - ${format(end, "d MMM", { locale: ru })}`;
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Plane className="w-5 h-5 text-primary" />
            Кто сегодня в отпуске
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-4 bg-muted rounded w-3/4 mb-2 mx-auto"></div>
            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-center">
          <Plane className="w-5 h-5 text-primary" />
          Кто сегодня в отпуске
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {todayVacations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[180px]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Все на работе!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayVacations.map((vacation, index) => (
              <div key={vacation.id || `vacation-${index}`} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {vacation.employee_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(vacation.start_date, vacation.end_date)}
                    </p>
                    {vacation.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {vacation.description}
                      </p>
                    )}
                  </div>
                  <Badge className={getVacationTypeColor(vacation.vacation_type)} variant="secondary">
                    {getVacationTypeLabel(vacation.vacation_type)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayVacationsCard;