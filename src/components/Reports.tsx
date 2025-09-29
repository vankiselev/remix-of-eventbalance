import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Clock, FileText } from "lucide-react";

const reportSchema = z.object({
  project_name: z.string().min(1, "Выберите проект"),
  start_time: z.string().min(1, "Укажите время начала"),
  end_time: z.string().min(1, "Укажите время окончания"),
  preparation_work: z.string().min(1, "Опишите работу по подготовке"),
  onsite_work: z.string().min(1, "Опишите работу на площадке"),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface Report {
  id: string;
  project_name: string;
  start_time: string;
  end_time: string;
  preparation_work: string;
  onsite_work: string;
  created_at: string;
}

const Reports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      project_name: "",
      start_time: "",
      end_time: "",
      preparation_work: "",
      onsite_work: "",
    },
  });

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("event_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отчеты",
        variant: "destructive",
      });
    }
  };

  const fetchProjects = async () => {
    try {
      // Получаем статические проекты из financial_transactions
      const { data: staticProjects, error: staticError } = await supabase
        .from("financial_transactions")
        .select("static_project_name")
        .not("static_project_name", "is", null);

      if (staticError) throw staticError;

      // Получаем проекты из events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("name");

      if (eventsError) throw eventsError;

      const allProjects = [
        ...new Set([
          ...(staticProjects?.map(p => p.static_project_name).filter(Boolean) || []),
          ...(events?.map(e => e.name).filter(Boolean) || []),
        ])
      ].sort();

      setProjects(allProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список проектов",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchReports(), fetchProjects()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const onSubmit = async (data: ReportFormData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_reports")
        .insert({
          project_name: data.project_name,
          start_time: data.start_time,
          end_time: data.end_time,
          preparation_work: data.preparation_work,
          onsite_work: data.onsite_work,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отчет создан",
      });

      form.reset();
      fetchReports();
    } catch (error) {
      console.error("Error creating report:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать отчет",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Отчеты по мероприятиям</h1>
          <p className="text-muted-foreground">Заполните отчет о проведенном мероприятии</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Новый отчет
          </CardTitle>
          <CardDescription>
            Заполните информацию о проведенном мероприятии
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="project_name"
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
                        {projects.map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Время начала на площадке
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Время окончания на площадке
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preparation_work"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Работа по подготовке мероприятия</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Опишите что было сделано для подготовки мероприятия..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onsite_work"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Работа на площадке</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Опишите работу, проделанную на площадке..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать отчет
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Мои отчеты</CardTitle>
            <CardDescription>История созданных отчетов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{report.project_name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {report.start_time} - {report.end_time}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Подготовка:</span>
                      <p className="text-sm mt-1">{report.preparation_work}</p>
                    </div>
                    <div>
                      <span className="font-medium">На площадке:</span>
                      <p className="text-sm mt-1">{report.onsite_work}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;