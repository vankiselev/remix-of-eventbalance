import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vacation {
  id: string;
  employee_name: string;
  vacation_type: string;
  description: string | null;
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
        .select("id, employee_name, vacation_type, description")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("status", "approved");

      if (error) throw error;
      setTodayVacations(data || []);
    } catch (error) {
      console.error("Error fetching today's vacations:", error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Кто сегодня в отпуске</CardTitle>
          <Plane className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Кто сегодня в отпуске</CardTitle>
        <Plane className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {todayVacations.length === 0 ? (
          <div className="text-center py-4">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Все на работе!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayVacations.map((vacation) => (
              <div key={vacation.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {vacation.employee_name}
                  </p>
                  {vacation.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {vacation.description}
                    </p>
                  )}
                </div>
                <Badge className={getVacationTypeColor(vacation.vacation_type)} variant="secondary">
                  {getVacationTypeLabel(vacation.vacation_type)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayVacationsCard;