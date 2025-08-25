import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_OWNERS, EXPENSE_INCOME_CATEGORIES } from '@/utils/constants';


const transactionSchema = z.object({
  operation_date: z.date(),
  project_id: z.string().optional(),
  project_owner: z.string().min(1, "Выберите владельца проекта"),
  description: z.string().min(1, "Введите описание"),
  expense_amount: z.number().min(0),
  income_amount: z.number().min(0),
  category: z.string().min(1, "Выберите категорию"),
}).refine((data) => {
  return (data.expense_amount > 0 && data.income_amount === 0) || 
         (data.income_amount > 0 && data.expense_amount === 0);
}, {
  message: "Укажите либо сумму трат, либо сумму прихода",
  path: ["expense_amount"]
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Event {
  id: string;
  name: string;
}

const TransactionForm = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: new Date(),
      project_owner: "",
      description: "",
      expense_amount: 0,
      income_amount: 0,
      category: "",
    },
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          operation_date: data.operation_date.toISOString().split('T')[0],
          project_id: data.project_id || null,
          project_owner: data.project_owner,
          description: data.description,
          expense_amount: data.expense_amount,
          income_amount: data.income_amount,
          category: data.category,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Операция добавлена",
        description: "Финансовая операция успешно сохранена",
      });

      form.reset({
        operation_date: new Date(),
        project_owner: "",
        description: "",
        expense_amount: 0,
        income_amount: 0,
        category: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить операцию",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredCategories = EXPENSE_INCOME_CATEGORIES.filter(category =>
    category.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Внести Трату/Приход</CardTitle>
        <CardDescription>
          Добавление новой финансовой операции
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Operation Date */}
          <div className="space-y-2">
            <Label>Дата операции</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("operation_date") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("operation_date") ? (
                    format(form.watch("operation_date"), "PPP", { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("operation_date")}
                  onSelect={(date) => date && form.setValue("operation_date", date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Проект</Label>
            <Select onValueChange={(value) => form.setValue("project_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите проект (опционально)" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Поиск проекта..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                {filteredEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Owner */}
          <div className="space-y-2">
            <Label>Чей проект *</Label>
            <Select onValueChange={(value) => form.setValue("project_owner", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите владельца проекта" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_OWNERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.project_owner && (
              <p className="text-sm text-destructive">
                {form.formState.errors.project_owner.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Подробное описание *</Label>
            <Textarea
              placeholder="Введите подробное описание операции"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Amount Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Сумма Траты (₽)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("expense_amount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Сумма Прихода (₽)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("income_amount", { valueAsNumber: true })}
              />
            </div>
          </div>
          {form.formState.errors.expense_amount && (
            <p className="text-sm text-destructive">
              {form.formState.errors.expense_amount.message}
            </p>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label>Статья прихода/расхода *</Label>
            <Select onValueChange={(value) => form.setValue("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Поиск категории..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>
                {filteredCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить операцию"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;