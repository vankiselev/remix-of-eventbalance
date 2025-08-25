import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, Edit, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import EventDetailsDialog from "@/components/EventDetailsDialog";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  status: string;
  location: string | null;
  venue_id: string | null;
  contractor_ids: string[] | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  photos: string[] | null;
  videos: string[] | null;
  notes: string | null;
  project_owner: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  holiday: string | null;
  managers: string | null;
  animators: string | null;
  show_program: string | null;
  contractors: string | null;
  photo_video: string | null;
  is_archived: boolean;
  google_sheets_row_id: string | null;
}

interface SyncStatus {
  id: string;
  last_sync_time: string;
  sync_month: string;
  sync_year: number;
  created_count: number;
  updated_count: number;
  archived_count: number;
  sync_status: string;
  error_message: string | null;
}

const EventCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [editingCell, setEditingCell] = useState<{day: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [scale, setScale] = useState(70); // Default 70% scale
  const [columnWidths, setColumnWidths] = useState<number[]>([8, 15, 12, 12, 15, 10, 12, 15, 12, 12, 15]); // Default flex values (percentages) for 11 columns
  const [isResizing, setIsResizing] = useState<{ columnIndex: number, startX: number, startWidth: number } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    event_time: "",
    project_owner: "",
    location: "",
    notes: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Google Sheets ID (you can make this configurable later)
  const GOOGLE_SHEETS_ID = "1BdEghO-rD-gHfaVjQGPmw-nPvdaQN-nZgWtGqgO-iC0"; // Example ID

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  useEffect(() => {
    fetchEvents();
    fetchSyncStatus();
    
    // Load saved scale from localStorage
    const savedScale = localStorage.getItem('calendar-scale');
    if (savedScale) {
      setScale(parseInt(savedScale, 10));
    }

    // Load saved column widths from localStorage
    const savedWidths = localStorage.getItem('calendar-column-widths');
    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    }
  }, [currentDate]);

  // Save scale to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('calendar-scale', scale.toString());
  }, [scale]);

  // Save column widths to localStorage when they change
  useEffect(() => {
    localStorage.setItem('calendar-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const handleScaleChange = (newScale: string) => {
    const scaleValue = parseInt(newScale, 10);
    setScale(scaleValue);
  };

  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    setIsResizing({
      columnIndex,
      startX: e.clientX,
      startWidth: columnWidths[columnIndex]
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - isResizing.startX;
    const flexChange = deltaX / 10; // Convert pixels to flex units
    const newWidth = Math.max(5, isResizing.startWidth + flexChange); // Minimum flex of 5
    
    setColumnWidths(prev => {
      const newWidths = [...prev];
      newWidths[isResizing.columnIndex] = newWidth;
      return newWidths;
    });
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
      };
    }
  }, [isResizing]);

  const getTotalFlex = () => {
    return columnWidths.reduce((sum, width) => sum + width, 0);
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_archived", false)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить мероприятия",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const monthName = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      
      const { data, error } = await supabase
        .from("sync_status")
        .select("*")
        .eq("sync_month", monthName)
        .eq("sync_year", year)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
        console.error("Error fetching sync status:", error);
      } else {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const handleGoogleSheetsSync = async () => {
    if (!user || syncing) return;

    setSyncing(true);
    
    try {
      const monthName = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();

      const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
        body: {
          sheetId: GOOGLE_SHEETS_ID,
          month: monthName, 
          year: year
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Синхронизация завершена!",
          description: data.message,
        });
        
        // Refresh events and sync status
        await fetchEvents();
        await fetchSyncStatus();
      } else {
        throw new Error(data.error || 'Неизвестная ошибка синхронизации');
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        variant: "destructive",
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать с Google Sheets",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("events").insert({
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        project_owner: formData.project_owner,
        location: formData.location,
        event_time: formData.event_time || null,
        notes: formData.notes,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Мероприятие создано",
      });

      setFormData({
        name: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        event_time: "",
        project_owner: "",
        location: "",
        notes: "",
      });
      setShowCreateDialog(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось создать мероприятие",
      });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const startDate = new Date(event.start_date);
      return date.toDateString() === startDate.toDateString();
    });
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.find(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() && 
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateHighlighted = (day: number) => {
    const event = getEventForDay(day);
    if (!event) return false;
    
    const eventDate = new Date(event.start_date);
    return !isPast(eventDate) || isToday(eventDate);
  };

  const handleCellEdit = (day: number, field: string, currentValue: string = "") => {
    setEditingCell({ day, field });
    setEditValue(currentValue);
  };

  const handleCellSave = async () => {
    if (!editingCell || !user) return;
    
    const event = getEventForDay(editingCell.day);
    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), editingCell.day);
    
    try {
      if (event) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({ [editingCell.field]: editValue })
          .eq("id", event.id);
          
        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from("events")
          .insert({
            name: editingCell.field === 'name' ? editValue : `Мероприятие ${editingCell.day}`,
            start_date: eventDate.toISOString().split('T')[0],
            [editingCell.field]: editValue,
            created_by: user.id,
          });
          
        if (error) throw error;
      }
      
      fetchEvents();
      toast({
        title: "Успешно!",
        description: "Данные обновлены",
      });
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Ошибка",
        description: error.message || "Не удалось сохранить изменения",
      });
    }
    
    setEditingCell(null);
    setEditValue("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "planning":
        return "Планирование";
      case "active":
        return "Активное";
      case "completed":
        return "Завершено";
      case "cancelled":
        return "Отменено";
      default:
        return status;
    }
  };

  const getDayOfWeekAbbr = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    const daysRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return daysRu[dayOfWeek];
  };

  const daysInMonth = getDaysInMonth();
  const maxDays = Math.max(...daysInMonth.map(d => d.getDate()));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Календарь мероприятий</h1>
        </div>
        <div className="animate-pulse">
          <div className="bg-muted h-96 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleGoogleSheetsSync}
            disabled={syncing || !user}
            size="sm"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Добавить мероприятие
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать новое мероприятие</DialogTitle>
                <DialogDescription>
                  Заполните информацию о мероприятии
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Праздник</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_owner">Чей проект?</Label>
                    <Input
                      id="project_owner"
                      value={formData.project_owner}
                      onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Дата</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_time">Время</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Место</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Примечания</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Создать мероприятие
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right side - Month navigation and scale */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground whitespace-nowrap">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Scale Control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Масштаб:</span>
            <Select value={scale.toString()} onValueChange={handleScaleChange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="30">30%</SelectItem>
                <SelectItem value="40">40%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="60">60%</SelectItem>
                <SelectItem value="70">70%</SelectItem>
                <SelectItem value="80">80%</SelectItem>
                <SelectItem value="90">90%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="110">110%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted/30 rounded-md">
          <div className="mb-1">
            Последняя синхронизация: {new Date(syncStatus.last_sync_time).toLocaleString('ru-RU')}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600">Создано: {syncStatus.created_count}</span>
            <span className="text-blue-600">Обновлено: {syncStatus.updated_count}</span>
            <span className="text-orange-600">Архивировано: {syncStatus.archived_count}</span>
          </div>
        </div>
      )}

      {/* Calendar Card Container */}
      <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        {/* Calendar Table */}
        <div 
          className="h-full overflow-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            '--scale-factor': scale / 100,
            '--font-size': `${Math.max(10, scale * 0.12)}px`,
            '--cell-padding': `${Math.max(4, scale * 0.08)}px`,
            '--cell-height': `${Math.max(30, scale * 0.4)}px`,
            '--header-height': `${Math.max(40, scale * 0.5)}px`,
          } as React.CSSProperties}
        >
          <div className="w-full min-w-full">
            {/* Fixed Header */}
            <div 
              className="bg-success border-b sticky top-0 z-20 flex w-full"
              style={{ height: 'var(--header-height)' }}
            >
              {[
                'Дата',
                'Праздник', 
                'Чей проект?',
                'Менеджеры',
                'Место',
                'Время',
                'Аниматоры',
                'Шоу/Программа',
                'Подрядчики',
                'Фото/Видео',
                'Примечания'
              ].map((title, index) => (
                <div key={title} className="relative flex">
                   <div 
                     className="text-center text-foreground font-bold border-r flex items-center justify-center"
                     style={{ 
                       fontSize: 'var(--font-size)', 
                       padding: 'var(--cell-padding)',
                       flex: `${columnWidths[index]}`,
                       minWidth: '0'
                     }}
                  >
                    {title}
                  </div>
                  {index < 10 && (
                    <div 
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-30"
                      onMouseDown={(e) => handleMouseDown(e, index)}
                      style={{ right: '-2px' }}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* Scrollable Content */}
            <div className="w-full">
              {Array.from({ length: maxDays }, (_, index) => {
                const day = index + 1;
                const event = getEventForDay(day);
                const isHighlighted = isDateHighlighted(day);
                
                 return (
                   <div 
                     key={day} 
                     className="flex border-b hover:bg-accent/50 transition-colors w-full"
                     style={{ height: 'var(--cell-height)' }}
                   >
                     {/* Дата */}
                     <div 
                       className={cn(
                         "text-center font-medium border-r text-foreground flex flex-col items-center justify-center",
                         isHighlighted && "bg-warning-light"
                       )}
                        style={{ 
                          fontSize: 'var(--font-size)', 
                          padding: 'var(--cell-padding)',
                          flex: `${columnWidths[0]}`,
                          minWidth: '0'
                        }}
                     >
                       <div>{day}</div>
                       <div className="opacity-70">{getDayOfWeekAbbr(day)}</div>
                     </div>
                     
                     {/* Праздник */}
                     <div 
                       className={cn(
                         "text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center",
                         isHighlighted && "bg-warning-light"
                       )}
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[1]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'name', event?.name || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'name' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.name || ''}</span>
                       )}
                     </div>
                     
                     {/* Чей проект? */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[2]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'project_owner', event?.project_owner || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'project_owner' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.project_owner || ''}</span>
                       )}
                     </div>
                     
                      {/* Менеджеры */}
                      <div 
                        className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                          style={{ 
                            fontSize: 'var(--font-size)', 
                            padding: 'var(--cell-padding)',
                            flex: `${columnWidths[3]}`,
                            minWidth: '0'
                          }}
                        onClick={() => handleCellEdit(day, 'managers', event?.managers || '')}
                      >
                        {editingCell?.day === day && editingCell?.field === 'managers' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                            className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                            style={{ fontSize: 'var(--font-size)' }}
                            autoFocus
                          />
                        ) : (
                          <span className="truncate w-full text-center px-2">{event?.managers || ''}</span>
                        )}
                      </div>
                     
                     {/* Место */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[4]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'location', event?.location || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'location' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.location || ''}</span>
                       )}
                     </div>
                     
                     {/* Время */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[5]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'event_time', event?.event_time || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'event_time' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.event_time || ''}</span>
                       )}
                     </div>
                     
                     {/* Аниматоры */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[6]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'animators', event?.animators || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'animators' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.animators || ''}</span>
                       )}
                     </div>
                     
                     {/* Шоу/Программа */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[7]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'show_program', event?.show_program || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'show_program' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.show_program || ''}</span>
                       )}
                     </div>
                     
                     {/* Подрядчики */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[8]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'contractors', event?.contractors || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'contractors' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.contractors || ''}</span>
                       )}
                     </div>
                     
                     {/* Фото/Видео */}
                     <div 
                       className="text-center border-r text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[9]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'photo_video', event?.photo_video || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'photo_video' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.photo_video || ''}</span>
                       )}
                     </div>
                     
                     {/* Примечания */}
                     <div 
                       className="text-center text-foreground cursor-pointer hover:bg-accent flex items-center justify-center"
                         style={{ 
                           fontSize: 'var(--font-size)', 
                           padding: 'var(--cell-padding)',
                           flex: `${columnWidths[10]}`,
                           minWidth: '0'
                         }}
                       onClick={() => handleCellEdit(day, 'notes', event?.notes || '')}
                     >
                       {editingCell?.day === day && editingCell?.field === 'notes' ? (
                         <Input
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={handleCellSave}
                           onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                           className="text-center h-auto border-0 bg-transparent p-1 min-h-[20px]"
                           style={{ fontSize: 'var(--font-size)' }}
                           autoFocus
                         />
                       ) : (
                         <span className="truncate w-full text-center px-2">{event?.notes || ''}</span>
                       )}
                     </div>
                   </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent as any}
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        onEventUpdated={fetchEvents}
      />
    </div>
  );
};

export default EventCalendar;