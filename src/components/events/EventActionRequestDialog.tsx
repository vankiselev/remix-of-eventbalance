import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendNotificationToAdmins } from "@/utils/notifications";

interface EventActionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  actionType: 'delete' | 'cancel';
}

interface FormData {
  comment: string;
}

export const EventActionRequestDialog = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  actionType,
}: EventActionRequestDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  const actionText = actionType === 'delete' ? 'удаление' : 'отмену';
  const actionTitle = actionType === 'delete' ? 'Запрос на удаление' : 'Запрос на отмену';

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await (supabase
        .from('event_action_requests') as any)
        .insert({
          event_id: eventId,
          requested_by: user.id,
          action_type: actionType,
          comment: data.comment,
        });

      if (error) throw error;

      // Send notification to admins
      await sendNotificationToAdmins(
        actionTitle,
        `Запрос на ${actionText} мероприятия "${eventName}"`,
        'event',
        { eventId, actionType }
      );

      toast.success(`Запрос на ${actionText} отправлен администратору`);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Не удалось отправить запрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionTitle} мероприятия</DialogTitle>
          <DialogDescription>
            Отправьте запрос администратору на {actionText} мероприятия "{eventName}". 
            Укажите причину в комментарии.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий *</Label>
              <Textarea
                id="comment"
                placeholder={`Укажите причину для ${actionText}...`}
                rows={4}
                {...register('comment', { 
                  required: 'Комментарий обязателен',
                  minLength: { value: 10, message: 'Минимум 10 символов' }
                })}
              />
              {errors.comment && (
                <p className="text-sm text-destructive">{errors.comment.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
