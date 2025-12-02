import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search, MapPin, Clock, Check } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFinancialReports, useFinancialReportItems } from "@/hooks/useFinancialReports";
import { useEvents } from "@/hooks/useEvents";
import { EstimateImportDialog } from "./EstimateImportDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FinancialReportCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
}

export const FinancialReportCreateDialog = ({ open, onOpenChange }: FinancialReportCreateDialogProps) => {
  const { createReport } = useFinancialReports();
  const { addItems } = useFinancialReportItems(null);
  const { data: events = [], isLoading } = useEvents();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<'future' | 'past' | 'all'>('all');
  const [estimateImportOpen, setEstimateImportOpen] = useState(false);
  const [estimateItems, setEstimateItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Period filter
    if (periodFilter === 'future') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });
    } else if (periodFilter === 'past') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      return periodFilter === 'past' 
        ? dateB.getTime() - dateA.getTime() 
        : dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [events, periodFilter, searchQuery]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.start_date);
      const dayKey = format(date, 'd MMMM yyyy', { locale: ru });
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event as Event);
    });
    
    return grouped;
  }, [filteredEvents]);

  const getTimeRange = (event: Event) => {
    if (!event.event_time && !event.end_time) return null;
    if (event.event_time && event.end_time) {
      return `${event.event_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;
    }
    if (event.event_time) return `с ${event.event_time.slice(0, 5)}`;
    return null;
  };

  const handleEstimateImport = (items: any[]) => {
    setEstimateItems(items);
    setEstimateImportOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedEvent) return;
    
    setIsSubmitting(true);
    try {
      // Calculate totals from estimate items
      const totalPlannedIncome = estimateItems
        .filter(item => item.item_type === 'income')
        .reduce((sum, item) => sum + (item.planned_amount || 0), 0);
      
      const totalPlannedExpense = estimateItems
        .filter(item => item.item_type === 'expense')
        .reduce((sum, item) => sum + (item.planned_amount || 0), 0);

      // Create the report
      const report = await createReport.mutateAsync({
        name: selectedEvent.name,
        event_id: selectedEvent.id,
        event_date: selectedEvent.start_date,
        total_planned_income: totalPlannedIncome,
        total_planned_expense: totalPlannedExpense,
      });

      // Add estimate items if any
      if (estimateItems.length > 0 && report?.id) {
        await addItems.mutateAsync(
          estimateItems.map((item, index) => ({
            report_id: report.id,
            item_type: item.item_type,
            category: item.category,
            description: item.description,
            planned_amount: item.planned_amount,
            sort_order: index,
          }))
        );
      }

      // Reset form and close
      setSelectedEvent(null);
      setSearchQuery("");
      setEstimateItems([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEvent(null);
      setSearchQuery("");
      setEstimateItems([]);
      setPeriodFilter('all');
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Создать финотчёт</DialogTitle>
            <DialogDescription>
              Выберите мероприятие для создания финансового отчёта
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск мероприятия..."
                  className="pl-9"
                />
              </div>
              <ToggleGroup 
                type="single" 
                value={periodFilter} 
                onValueChange={(v) => v && setPeriodFilter(v as typeof periodFilter)}
                className="justify-start"
              >
                <ToggleGroupItem value="future" size="sm">Будущие</ToggleGroupItem>
                <ToggleGroupItem value="past" size="sm">Прошедшие</ToggleGroupItem>
                <ToggleGroupItem value="all" size="sm">Все</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Events list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Мероприятия не найдены' : 'Нет мероприятий'}
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {Object.entries(groupedEvents).map(([day, dayEvents]) => (
                    <div key={day}>
                      <div className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                        {day}
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map((event) => {
                          const isSelected = selectedEvent?.id === event.id;
                          const timeRange = getTimeRange(event);
                          
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(isSelected ? null : event)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all",
                                "hover:bg-accent/50",
                                isSelected 
                                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                  : "border-border"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{event.name}</div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                                    {event.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate max-w-[200px]">{event.location}</span>
                                      </span>
                                    )}
                                    {timeRange && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {timeRange}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Estimate upload */}
            <div className="pt-2 border-t space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setEstimateImportOpen(true)}
                disabled={!selectedEvent}
              >
                <Upload className="mr-2 h-4 w-4" />
                {estimateItems.length > 0 
                  ? `Загружено ${estimateItems.length} статей` 
                  : "Загрузить смету из Excel"
                }
              </Button>
              {estimateItems.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Доходы: {estimateItems.filter(i => i.item_type === 'income').length} статей, 
                  Расходы: {estimateItems.filter(i => i.item_type === 'expense').length} статей
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedEvent || isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать финотчёт"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EstimateImportDialog
        open={estimateImportOpen}
        onOpenChange={setEstimateImportOpen}
        onImport={handleEstimateImport}
      />
    </>
  );
};
