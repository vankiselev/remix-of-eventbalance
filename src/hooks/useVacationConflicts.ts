import { supabase } from "@/integrations/supabase/client";

export interface VacationConflict {
  userId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  vacationType: string;
}

export const useVacationConflicts = () => {
  const checkConflicts = async (
    eventDate: string,
    userIds: string[]
  ): Promise<Map<string, VacationConflict>> => {
    if (!eventDate || userIds.length === 0) {
      return new Map();
    }

    try {
      const { data, error } = await supabase
        .from("vacations")
        .select("user_id, start_date, end_date, vacation_type, employee_name")
        .in("user_id", userIds)
        .eq("status", "approved")
        .lte("start_date", eventDate)
        .gte("end_date", eventDate);

      if (error) {
        console.error("Error checking vacation conflicts:", error);
        return new Map();
      }

      const conflictsMap = new Map<string, VacationConflict>();
      
      data?.forEach((vacation) => {
        conflictsMap.set(vacation.user_id, {
          userId: vacation.user_id,
          employeeName: vacation.employee_name,
          startDate: vacation.start_date,
          endDate: vacation.end_date,
          vacationType: vacation.vacation_type,
        });
      });

      return conflictsMap;
    } catch (error) {
      console.error("Error in checkConflicts:", error);
      return new Map();
    }
  };

  return { checkConflicts };
};
