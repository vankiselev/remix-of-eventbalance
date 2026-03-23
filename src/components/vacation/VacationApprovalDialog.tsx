import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getVacationTypeLabel, calculateVacationDays } from "@/utils/vacationConstants";

interface Vacation {
  id: string;
  user_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface VacationApprovalDialogProps {
  vacation: Vacation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const VacationApprovalDialog = ({
  vacation,
  open,
  onOpenChange,
  onSuccess,
}: VacationApprovalDialogProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!vacation) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('vacations')
        .update({ status: 'approved' })
        .eq('id', vacation.id);

      if (updateError) throw updateError;

      // Send notification via edge function
      const { error: notifyError } = await supabase.functions.invoke('vacation-status-notification', {
        body: {
          user_id: vacation.user_id,
          vacation_id: vacation.id,
          status: 'approved',
          vacation_type: vacation.vacation_type,
          start_date: vacation.start_date,
          end_date: vacation.end_date,
          comment: comment || null,
        },
      });

      if (notifyError) {
        console.error('Notification error:', notifyError);
      }

      toast.success('Заявка на отпуск одобрена');
      setComment("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error approving vacation:', error);
      toast.error('Ошибка при одобрении заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('vacations')
        .update({ status: 'rejected' })
        .eq('id', vacation.id);

      if (updateError) throw updateError;

      // Send notification via edge function
      const { error: notifyError } = await supabase.functions.invoke('vacation-status-notification', {
        body: {
          user_id: vacation.user_id,
          vacation_id: vacation.id,
          status: 'rejected',
          vacation_type: vacation.vacation_type,
          start_date: vacation.start_date,
          end_date: vacation.end_date,
          comment: comment,
        },
      });

      if (notifyError) {
        console.error('Notification error:', notifyError);
      }

      toast.success('Заявка на отпуск отклонена');
      setComment("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error rejecting vacation:', error);
      toast.error('Ошибка при отклонении заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVacationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekend: "Выходной",
      vacation: "Отпуск",
      sick: "Больничный",
      personal: "Личное",
      fun: "Кайфануть",
      study: "Учеба"
    };
    return labels[type] || type;
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Управление заявкой на отпуск</DialogTitle>
          <DialogDescription>
            Одобрите или отклоните заявку сотрудника
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Сотрудник</p>
              <p className="font-medium">{vacation.employee_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Тип</p>
              <Badge variant="secondary">{getVacationTypeLabel(vacation.vacation_type)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата начала</p>
              <p className="font-medium">{format(new Date(vacation.start_date), 'dd MMMM yyyy', { locale: ru })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата окончания</p>
              <p className="font-medium">{format(new Date(vacation.end_date), 'dd MMMM yyyy', { locale: ru })}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Количество дней</p>
              <p className="font-medium">{calculateDays(vacation.start_date, vacation.end_date)} дней</p>
            </div>
          </div>

          {/* Описание от сотрудника */}
          {vacation.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Примечание сотрудника</p>
              <p className="text-sm border rounded-md p-3 bg-muted/50">
                {vacation.description}
              </p>
            </div>
          )}

          {/* Комментарий администратора */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Комментарий {vacation.status === 'rejected' && <span className="text-destructive">*</span>}
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий (обязательно при отклонении)"
              rows={3}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1"
              variant="default"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Одобрить
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
