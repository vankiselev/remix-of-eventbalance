import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PROJECT_OWNERS, EXPENSE_INCOME_CATEGORIES } from '@/utils/constants';
import { formatCurrency, parseCurrency } from '@/utils/currency';

const transactionSchema = z.object({
  operation_date: z.date(),
  project_id: z.string().min(1, 'Выберите проект'),
  project_owner: z.string().min(1, 'Выберите владельца проекта'),
  description: z.string().min(1, 'Введите описание'),
  expense_amount: z.string().optional(),
  income_amount: z.string().optional(),
  category: z.string().min(1, 'Выберите категорию'),
}).refine((data) => {
  const expense = parseCurrency(data.expense_amount || '0');
  const income = parseCurrency(data.income_amount || '0');
  return (expense > 0 && income === 0) || (income > 0 && expense === 0);
}, {
  message: 'Укажите либо сумму расхода, либо сумму прихода',
  path: ['expense_amount']
});

interface Event {
  id: string;
  name: string;
}

const FinancialTransaction = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: new Date(),
      project_id: '',
      project_owner: '',
      description: '',
      expense_amount: '',
      income_amount: '',
      category: '',
    },
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить список проектов',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    if (!user) return;

    setSubmitting(true);
    try {
      const expense = parseCurrency(values.expense_amount || '0');
      const income = parseCurrency(values.income_amount || '0');

      const { error } = await supabase
        .from('financial_transactions')
        .insert({
          created_by: user.id,
          operation_date: values.operation_date.toISOString().split('T')[0],
          project_id: values.project_id,
          project_owner: values.project_owner,
          description: values.description,
          expense_amount: expense || 0,
          income_amount: income || 0,
          category: values.category,
        });

      if (error) throw error;

      toast({
        title: 'Успешно!',
        description: 'Финансовая операция добавлена',
      });

      form.reset({
        operation_date: new Date(),
        project_id: '',
        project_owner: '',
        description: '',
        expense_amount: '',
        income_amount: '',
        category: '',
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось добавить операцию',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredCategories = EXPENSE_INCOME_CATEGORIES.filter(category =>
    category.toLowerCase().includes(categorySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Внести Трату/Приход</CardTitle>
          <CardDescription>
            Добавьте новую финансовую операцию в систему
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="operation_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата операции</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Selection */}
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Поиск проекта..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredEvents.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Owner */}
              <FormField
                control={form.control}
                name="project_owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Чей проект</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите владельца" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_OWNERS.map((owner) => (
                          <SelectItem key={owner} value={owner}>
                            {owner}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подробное описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Введите описание операции..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expense_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма Траты</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (e.target.value) {
                              form.setValue('income_amount', '');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="income_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма Прихода</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (e.target.value) {
                              form.setValue('expense_amount', '');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Selection */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статья прихода/расхода</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Поиск категории..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Добавить операцию
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialTransaction;