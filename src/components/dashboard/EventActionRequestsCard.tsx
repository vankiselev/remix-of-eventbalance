import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileQuestion, Trash2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { sendNotification } from "@/utils/notifications";

interface EventActionRequest {
  id: string;
  event_id: string;
  requested_by: string;
  action_type: 'delete' | 'cancel';
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  events: {
    name: string;
  };
  requester_name?: string;
}

export const EventActionRequestsCard = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<EventActionRequest | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['event-action-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_action_requests')
        .select(`
          *,
          events(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get requester names
      const requestsWithNames = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', request.requested_by)
            .single();

          return {
            ...request,
            requester_name: profile?.full_name || 'Неизвестный пользователь',
          };
        })
      );

      return requestsWithNames as EventActionRequest[];
    },
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('event_action_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment || null,
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Execute the action
      if (selectedRequest.action_type === 'delete') {
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', selectedRequest.event_id);

        if (deleteError) throw deleteError;
      } else if (selectedRequest.action_type === 'cancel') {
        const { error: cancelError } = await supabase
          .from('events')
          .update({ status: 'cancelled' })
          .eq('id', selectedRequest.event_id);

        if (cancelError) throw cancelError;
      }

      // Send notification to requester
      await sendNotification({
        userId: selectedRequest.requested_by,
        title: 'Запрос одобрен',
        message: `Ваш запрос на ${selectedRequest.action_type === 'delete' ? 'удаление' : 'отмену'} мероприятия "${selectedRequest.events.name}" был одобрен`,
        type: 'event',
      });

      toast.success('Запрос одобрен');
      queryClient.invalidateQueries({ queryKey: ['event-action-requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedRequest(null);
      setReviewComment("");
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Не удалось одобрить запрос');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('event_action_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send notification to requester
      await sendNotification({
        userId: selectedRequest.requested_by,
        title: 'Запрос отклонён',
        message: `Ваш запрос на ${selectedRequest.action_type === 'delete' ? 'удаление' : 'отмену'} мероприятия "${selectedRequest.events.name}" был отклонён`,
        type: 'event',
      });

      toast.success('Запрос отклонён');
      queryClient.invalidateQueries({ queryKey: ['event-action-requests'] });
      setSelectedRequest(null);
      setReviewComment("");
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Не удалось отклонить запрос');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Запросы на действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Запросы на действия ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {request.action_type === 'delete' ? (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    ) : (
                      <XCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-medium truncate">{request.events.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.requester_name} •{' '}
                    {format(new Date(request.created_at), 'd MMMM, HH:mm', { locale: ru })}
                  </p>
                  <p className="text-sm mt-1 line-clamp-2">{request.comment}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(request)}
                  className="ml-3"
                >
                  Рассмотреть
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Рассмотрение запроса на{' '}
              {selectedRequest?.action_type === 'delete' ? 'удаление' : 'отмену'}
            </DialogTitle>
            <DialogDescription>
              Мероприятие: {selectedRequest?.events.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">От кого:</Label>
              <p className="text-sm">
                {selectedRequest?.requester_name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Причина:</Label>
              <p className="text-sm">{selectedRequest?.comment}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Комментарий (необязательно)</Label>
              <Textarea
                id="review-comment"
                placeholder="Добавьте комментарий..."
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
            >
              Отклонить
            </Button>
            <Button
              variant="destructive"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? 'Обработка...' : 'Одобрить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
