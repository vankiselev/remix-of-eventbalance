import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, Edit, Save, X, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';

const eventSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  location: z.string().optional(),
  start_date: z.date(),
  end_date: z.date(),
  event_time: z.string().optional(),
  budget: z.string().min(1, 'Бюджет обязателен'),
  actual_cost: z.string().optional(),
  status: z.string(),
  project_owner: z.string().optional(),
  show_program: z.string().optional(),
  notes: z.string().optional(),
});

interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  event_time?: string;
  budget: number;
  actual_cost?: number;
  status: string;
  project_owner?: string;
  show_program?: string;
  notes?: string;
  animators?: string[];
  contractors?: string[];
  managers?: string[];
  photos?: string[];
  videos?: string[];
  created_by: string;
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
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setEvent(data);
      
      // Populate form with event data
      form.reset({
        name: data.name,
        description: data.description || '',
        location: data.location || '',
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        event_time: data.event_time || '',
        budget: data.budget?.toString() || '0',
        actual_cost: data.actual_cost?.toString() || '0',
        status: data.status,
        project_owner: data.project_owner || '',
        show_program: data.show_program || '',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить информацию о мероприятии',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    if (!user || !event) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: values.name,
          description: values.description,
          location: values.location,
          start_date: values.start_date.toISOString().split('T')[0],
          end_date: values.end_date.toISOString().split('T')[0],
          event_time: values.event_time,
          budget: parseFloat(values.budget) || 0,
          actual_cost: parseFloat(values.actual_cost || '0') || 0,
          status: values.status,
          project_owner: values.project_owner,
          show_program: values.show_program,
          notes: values.notes,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Успешно!',
        description: 'Мероприятие обновлено',
      });

      setEditing(false);
      await fetchEvent(); // Refresh data
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
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
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
      case 'active':
        return 'Активное';
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
        <p>Мероприятие не найдено</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
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
          {(user?.id === event.created_by) && (
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
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Место проведения</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dates and Details */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Дата начала</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ru })
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Дата окончания</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ru })
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="event_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Время</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Статус</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planning">Планирование</SelectItem>
                              <SelectItem value="active">Активное</SelectItem>
                              <SelectItem value="completed">Завершено</SelectItem>
                              <SelectItem value="cancelled">Отменено</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Financial Info */}
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Бюджет</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actual_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Фактические затраты</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Владелец проекта</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Info */}
                <Separator />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="show_program"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Шоу программа</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Заметки</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <div className="space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{event.name}</CardTitle>
                  {event.description && (
                    <CardDescription className="mt-2">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Место проведения</p>
                  <p>{event.location || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Дата начала</p>
                  <p>{format(new Date(event.start_date), "PPP", { locale: ru })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Дата окончания</p>
                  <p>{format(new Date(event.end_date), "PPP", { locale: ru })}</p>
                </div>
                {event.event_time && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Время</p>
                    <p>{event.event_time}</p>
                  </div>
                )}
                {event.project_owner && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Владелец проекта</p>
                    <p>{event.project_owner}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Бюджет</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(event.budget)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Фактические затраты</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(event.actual_cost || 0)}
                  </p>
                </div>
              </div>

              {event.show_program && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Шоу программа</p>
                    <p className="whitespace-pre-wrap">{event.show_program}</p>
                  </div>
                </>
              )}

              {event.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Заметки</p>
                    <p className="whitespace-pre-wrap">{event.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EventDetails;