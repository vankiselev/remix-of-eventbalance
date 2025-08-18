import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface Event {
  id: string;
  name: string;
}

interface Income {
  id: string;
  source: string;
  description: string;
  amount: number;
  income_date: string;
  event_id: string;
  events?: { name: string };
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  event_id: string;
  events?: { name: string };
}

const Finances = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  
  const [incomeForm, setIncomeForm] = useState({
    source: "",
    description: "",
    amount: "",
    income_date: "",
    event_id: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
    expense_date: "",
    event_id: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name")
        .order("name");

      // Fetch incomes
      const { data: incomesData } = await supabase
        .from("incomes")
        .select("*, events(name)")
        .order("income_date", { ascending: false });

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*, events(name)")
        .order("expense_date", { ascending: false });

      setEvents(eventsData || []);
      setIncomes(incomesData || []);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить финансовые данные",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("incomes").insert({
        source: incomeForm.source,
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
        income_date: incomeForm.income_date,
        event_id: incomeForm.event_id,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Доход добавлен",
      });

      setIncomeForm({
        source: "",
        description: "",
        amount: "",
        income_date: "",
        event_id: "",
      });
      setShowIncomeDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить доход",
      });
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("expenses").insert({
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        event_id: expenseForm.event_id,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Расход добавлен",
      });

      setExpenseForm({
        category: "",
        description: "",
        amount: "",
        expense_date: "",
        event_id: "",
      });
      setShowExpenseDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить расход",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Финансы</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="bg-muted h-5 w-24 rounded"></div>
                  <div className="bg-muted h-8 w-32 rounded"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-muted-foreground">Управляйте доходами и расходами</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общие расходы</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Income and Expenses */}
      <Tabs defaultValue="incomes" className="w-full">
        <TabsList>
          <TabsTrigger value="incomes">Доходы</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
        </TabsList>
        
        <TabsContent value="incomes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Доходы</h2>
            <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить доход
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить доход</DialogTitle>
                  <DialogDescription>
                    Введите информацию о доходе
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateIncome} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-source">Источник</Label>
                    <Input
                      id="income-source"
                      value={incomeForm.source}
                      onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-description">Описание</Label>
                    <Textarea
                      id="income-description"
                      value={incomeForm.description}
                      onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-amount">Сумма (₽)</Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-date">Дата</Label>
                    <Input
                      id="income-date"
                      type="date"
                      value={incomeForm.income_date}
                      onChange={(e) => setIncomeForm({ ...incomeForm, income_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-event">Мероприятие</Label>
                    <Select 
                      value={incomeForm.event_id} 
                      onValueChange={(value) => setIncomeForm({ ...incomeForm, event_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите мероприятие" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Добавить доход
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {incomes.map((income) => (
              <Card key={income.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{income.source}</h3>
                      <p className="text-sm text-muted-foreground">{income.description}</p>
                      <Badge variant="outline">{income.events?.name}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(income.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(income.income_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Расходы</h2>
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить расход
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить расход</DialogTitle>
                  <DialogDescription>
                    Введите информацию о расходе
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Категория</Label>
                    <Select 
                      value={expenseForm.category} 
                      onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catering">Кейтеринг</SelectItem>
                        <SelectItem value="venue">Аренда площадки</SelectItem>
                        <SelectItem value="equipment">Оборудование</SelectItem>
                        <SelectItem value="decoration">Декор</SelectItem>
                        <SelectItem value="staff">Персонал</SelectItem>
                        <SelectItem value="marketing">Маркетинг</SelectItem>
                        <SelectItem value="other">Прочее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Описание</Label>
                    <Textarea
                      id="expense-description"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount">Сумма (₽)</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-date">Дата</Label>
                    <Input
                      id="expense-date"
                      type="date"
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-event">Мероприятие</Label>
                    <Select 
                      value={expenseForm.event_id} 
                      onValueChange={(value) => setExpenseForm({ ...expenseForm, event_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите мероприятие" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Добавить расход
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{expense.category}</h3>
                      <p className="text-sm text-muted-foreground">{expense.description}</p>
                      <Badge variant="outline">{expense.events?.name}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        -{formatCurrency(expense.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(expense.expense_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finances;