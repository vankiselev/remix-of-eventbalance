import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Save, X, MapPin, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string;
  event_time: string | null;
  status: string;
  project_owner: string | null;
  notes: string | null;
  venue_id: string | null;
  contractor_ids: string[] | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  photos: string[] | null;
  videos: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EventDetailsProps {
  eventId: string;
  onBack: () => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ eventId, onBack }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    start_date: '',
    event_time: '',
    status: '',
    project_owner: '',
    notes: '',
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            variant: 'destructive',
            title: 'Ошибка',
            description: 'Данные по мероприятию отсутствуют',
          });
        } else {
          throw error;
        }
        return;
      }

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Данные по мероприятию отсутствуют',
        });
        return;
      }

      setEvent(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        location: data.location || '',
        start_date: data.start_date,
        event_time: data.event_time || '',
        status: data.status,
        project_owner: data.project_owner || '',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить данные мероприятия',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !event) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: formData.name,
          description: formData.description,
          location: formData.location,
          start_date: formData.start_date,
          event_time: formData.event_time || null,
          status: formData.status,
          project_owner: formData.project_owner,
          notes: formData.notes,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Успешно!',
        description: 'Мероприятие обновлено',
      });

      setEditing(false);
      await fetchEvent();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось обновить мероприятие',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return 'Планирование';
      case 'confirmed':
        return 'Подтверждено';
      case 'in_progress':
        return 'В процессе';
      case 'completed':
        return 'Завершено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Данные по мероприятию отсутствуют</p>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к мероприятиям
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к мероприятиям
        </Button>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(event.status)}>
            {getStatusText(event.status)}
          </Badge>
          {user?.id === event.created_by && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Отмена
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        /* Edit Mode */
        <Card>
          <CardHeader>
            <CardTitle>Редактирование мероприятия</CardTitle>
            <CardDescription>
              Внесите изменения в информацию о мероприятии
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Название</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Дата</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Время</label>
                <Input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Локация</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Владелец проекта</label>
              <Input
                value={formData.project_owner}
                onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="planning">Планирование</option>
                <option value="confirmed">Подтверждено</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Завершено</option>
                <option value="cancelled">Отменено</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Примечания</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{event.name}</CardTitle>
            {event.description && (
              <CardDescription>
                {event.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Дата и время</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(event.start_date), 'dd MMMM yyyy', { locale: ru })}
                    {event.event_time && ` в ${event.event_time.slice(0, 5)}`}
                  </span>
                </div>
              </div>

              {event.location && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Локация</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              )}

              {event.project_owner && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Владелец проекта</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{event.project_owner}</span>
                  </div>
                </div>
              )}
            </div>

            {event.notes && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Примечания</h4>
                <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventDetails;