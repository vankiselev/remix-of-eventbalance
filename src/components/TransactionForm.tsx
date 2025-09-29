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
import { CurrencyInput } from "@/components/ui/currency-input";
import { PROJECT_OWNERS, EXPENSE_INCOME_CATEGORIES, STATIC_PROJECTS } from '@/utils/constants';


const transactionSchema = z.object({
  operation_date: z.date(),
  project_id: z.string().optional(),
  static_project_name: z.string().optional(),
  project_owner: z.string().min(1, "Выберите владельца проекта"),
  description: z.string().min(1, "Введите описание"),
  expense_amount: z.number().optional(),
  income_amount: z.number().optional(),
  category: z.string().min(1, "Выберите категорию"),
}).refine((data) => {
  const hasExpense = data.expense_amount && data.expense_amount > 0;
  const hasIncome = data.income_amount && data.income_amount > 0;
  
  if (!hasExpense && !hasIncome) return false;
  if (hasExpense && hasIncome) return false;
  
  return true;
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
  const [allProjects, setAllProjects] = useState<(Event | { id: string; name: string; isStatic: boolean })[]>([]);
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      operation_date: new Date(),
      project_owner: "",
      description: "",
      expense_amount: undefined,
      income_amount: undefined,
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
      
      // Combine static projects with events
      const staticProjects = STATIC_PROJECTS.map(project => ({
        id: `static_${project}`,
        name: project,
        isStatic: true
      }));
      
      setAllProjects([...staticProjects, ...(data || [])]);
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
          project_id: data.static_project_name ? null : (data.project_id || null),
          static_project_name: data.static_project_name || null,
          project_owner: data.project_owner,
          description: data.description,
          expense_amount: data.expense_amount || 0,
          income_amount: data.income_amount || 0,
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
        expense_amount: undefined,
        income_amount: undefined,
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

  const filteredProjects = allProjects.filter(project =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase())
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
            <Select onValueChange={(value) => {
              if (value.startsWith('static_')) {
                const staticProjectName = value.replace('static_', '');
                form.setValue("static_project_name", staticProjectName);
                form.setValue("project_id", undefined);
              } else {
                form.setValue("project_id", value);
                form.setValue("static_project_name", undefined);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Поиск проекта..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                {filteredProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
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
              <CurrencyInput
                value={form.watch("expense_amount")}
                onChange={(value) => {
                  form.setValue("expense_amount", value);
                  if (value && value > 0) {
                    form.setValue("income_amount", undefined);
                  }
                }}
                placeholder="Введите сумму трат"
              />
            </div>
            <div className="space-y-2">
              <Label>Сумма Прихода (₽)</Label>
              <CurrencyInput
                value={form.watch("income_amount")}
                onChange={(value) => {
                  form.setValue("income_amount", value);
                  if (value && value > 0) {
                    form.setValue("expense_amount", undefined);
                  }
                }}
                placeholder="Введите сумму прихода"
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