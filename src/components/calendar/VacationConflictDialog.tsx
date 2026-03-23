import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { VacationConflict } from "@/hooks/useVacationConflicts";
import { vacationTypeConflictLabels } from "@/utils/vacationConstants";

interface VacationConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    name: string;
    conflict: VacationConflict;
  } | null;
  onConfirm: () => void;
}

const getVacationTypeLabel = (type: string): string => {
  return vacationTypeConflictLabels[type] || "недоступен";
};

export const VacationConflictDialog = ({
  open,
  onOpenChange,
  employee,
  onConfirm,
}: VacationConflictDialogProps) => {
  if (!employee) return null;

  const startDate = format(new Date(employee.conflict.startDate), "dd.MM.yyyy", { locale: ru });
  const endDate = format(new Date(employee.conflict.endDate), "dd.MM.yyyy", { locale: ru });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Конфликт с отпуском</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <span className="font-medium">{employee.name}</span>{" "}
              {getVacationTypeLabel(employee.conflict.vacationType)}
            </p>
            <p className="text-sm">
              с <span className="font-medium">{startDate}</span> по{" "}
              <span className="font-medium">{endDate}</span>
            </p>
            <p className="mt-4">Вы уверены, что хотите назначить этого сотрудника на мероприятие?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Назначить все равно</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
