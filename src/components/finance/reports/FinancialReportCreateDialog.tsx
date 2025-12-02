import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Upload } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFinancialReports, useFinancialReportItems } from "@/hooks/useFinancialReports";
import { useEvents } from "@/hooks/useEvents";
import { EstimateImportDialog } from "./EstimateImportDialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface FinancialReportCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FinancialReportCreateDialog = ({ open, onOpenChange }: FinancialReportCreateDialogProps) => {
  const { createReport } = useFinancialReports();
  const { addItems } = useFinancialReportItems(null);
  const { data: events } = useEvents();
  
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [estimateImportOpen, setEstimateImportOpen] = useState(false);
  const [estimateItems, setEstimateItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredEvents = events?.filter(e => 
    e.name.toLowerCase().includes(name.toLowerCase())
  ).slice(0, 5);

  const handleSelectEvent = (event: any) => {
    setName(event.name);
    if (event.start_date) {
      setEventDate(new Date(event.start_date));
    }
    setShowEventSuggestions(false);
  };

  const handleEstimateImport = (items: any[]) => {
    setEstimateItems(items);
    setEstimateImportOpen(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
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
        name: name.trim(),
        event_date: eventDate?.toISOString().split('T')[0],
        notes: notes.trim() || undefined,
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
      setName("");
      setEventDate(undefined);
      setNotes("");
      setEstimateItems([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать финотчёт</DialogTitle>
            <DialogDescription>
              Создайте финансовый отчёт по мероприятию и загрузите смету
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name with autocomplete */}
            <div className="space-y-2">
              <Label>Название мероприятия *</Label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setShowEventSuggestions(e.target.value.length > 1);
                  }}
                  onFocus={() => name.length > 1 && setShowEventSuggestions(true)}
                  placeholder="Введите название..."
                />
                {showEventSuggestions && filteredEvents && filteredEvents.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                    <Command>
                      <CommandList>
                        <CommandGroup heading="Мероприятия">
                          {filteredEvents.map((event) => (
                            <CommandItem
                              key={event.id}
                              onSelect={() => handleSelectEvent(event)}
                            >
                              {event.name}
                              {event.start_date && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {format(new Date(event.start_date), 'd MMM yyyy', { locale: ru })}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>

            {/* Event date */}
            <div className="space-y-2">
              <Label>Дата мероприятия</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, 'd MMMM yyyy', { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                rows={2}
              />
            </div>

            {/* Estimate import */}
            <div className="space-y-2">
              <Label>Смета</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setEstimateImportOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                {estimateItems.length > 0 
                  ? `Загружено ${estimateItems.length} статей` 
                  : "Загрузить смету из Excel"
                }
              </Button>
              {estimateItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Доходы: {estimateItems.filter(i => i.item_type === 'income').length} статей, 
                  Расходы: {estimateItems.filter(i => i.item_type === 'expense').length} статей
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать"}
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
