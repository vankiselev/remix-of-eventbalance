import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { VacationConflict } from "@/hooks/useVacationConflicts";

interface VacationConflictBadgeProps {
  conflict: VacationConflict;
}

const getVacationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    annual: "В отпуске",
    sick: "На больничном",
    fun: "Выходной",
  };
  return labels[type] || "Недоступен";
};

export const VacationConflictBadge = ({ conflict }: VacationConflictBadgeProps) => {
  const startDate = format(new Date(conflict.startDate), "dd.MM.yyyy", { locale: ru });
  const endDate = format(new Date(conflict.endDate), "dd.MM.yyyy", { locale: ru });
  const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle className="h-3 w-3 ml-1 text-destructive" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            ⚠️ {getVacationTypeLabel(conflict.vacationType)}: {dateRange}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
