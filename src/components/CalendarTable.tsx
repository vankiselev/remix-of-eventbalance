import React from "react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  status: string;
  location: string | null;
  project_owner: string | null;
  managers: string | null;
  animators: string | null;
  contractors: string | null;
  show_program: string | null;
  photo_video: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  date: string;
  dayOfWeek: string;
  events: Event[];
}

interface CalendarTableProps {
  calendarEvents: CalendarEvent[];
  zoom: number;
  loading: boolean;
  onEventEdit: (event: Event) => void;
  selectedMonth: number;
  selectedYear: number;
}

const CalendarTable = ({
  calendarEvents,
  zoom,
  loading,
  onEventEdit,
  selectedMonth,
  selectedYear
}: CalendarTableProps) => {
  const renderCell = (calendarEvent: CalendarEvent, field: string) => {
    if (!calendarEvent.events.length) return null;

    // Для поля "Дата" показываем только число и день недели
    if (field === 'date') {
      const day = new Date(calendarEvent.date).getDate();
      return (
        <div className="text-center leading-tight">
          <div className="text-sm font-medium">{day}</div>
          <div className="text-xs text-muted-foreground">{calendarEvent.dayOfWeek}</div>
        </div>
      );
    }

    // Для всех остальных полей объединяем данные всех событий на эту дату
    const values = calendarEvent.events
      .map(event => {
        switch (field) {
          case 'name':
            return event.name;
          case 'project_owner':
            return event.project_owner;
          case 'managers':
            return event.managers;
          case 'location':
            return event.location;
          case 'time':
            return event.event_time ? `${event.event_time.slice(0, 5)}${event.end_time ? `-${event.end_time.slice(0, 5)}` : ''}` : '';
          case 'animators':
            return event.animators;
          case 'show_program':
            return event.show_program;
          case 'contractors':
            return event.contractors;
          case 'photo':
            return event.photo_video;
          case 'video':
            return event.photo_video;
          case 'notes':
            return event.notes;
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join('\n');

    return values || null;
  };

  const handleCellClick = (calendarEvent: CalendarEvent) => {
    if (calendarEvent.events.length === 1) {
      onEventEdit(calendarEvent.events[0]);
    } else if (calendarEvent.events.length > 1) {
      // Если несколько событий, показываем первое (можно расширить логику)
      onEventEdit(calendarEvent.events[0]);
    }
  };

  const isWeekend = (date: string) => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // воскресенье или суббота
  };

  const getColumnColor = (field: string) => {
    switch (field) {
      case 'animators':
        return 'bg-calendar-animators';
      case 'show_program':
        return 'bg-calendar-show';
      case 'contractors':
        return 'bg-calendar-contractors';
      case 'photo':
        return 'bg-calendar-photo';
      case 'video':
        return 'bg-calendar-video';
      case 'notes':
        return 'bg-calendar-notes';
      default:
        return '';
    }
  };

  // Подготовим плоский список строк: по событию на строку, дату повторяем
  const displayRows = calendarEvents.flatMap((ce) => {
    if (ce.events.length > 0) {
      return ce.events.map((ev) => ({ date: ce.date, dayOfWeek: ce.dayOfWeek, event: ev }));
    }
    return [{ date: ce.date, dayOfWeek: ce.dayOfWeek, event: undefined }];
  });

  const getFieldValue = (row: { date: string; dayOfWeek: string; event?: Event }, field: string) => {
    const ev = row.event;

    if (field === 'date') {
      const day = new Date(row.date).getDate();
      return (
        <div className="text-center leading-tight">
          <div className="text-sm font-medium">{day}</div>
          <div className="text-xs text-muted-foreground">{row.dayOfWeek}</div>
        </div>
      );
    }

    if (!ev) return null;
    switch (field) {
      case 'name':
        return ev.name;
      case 'project_owner':
        return ev.project_owner;
      case 'managers':
        return ev.managers;
      case 'location':
        return ev.location;
      case 'time':
        return ev.event_time ? `${ev.event_time.slice(0, 5)}${ev.end_time ? `-${ev.end_time.slice(0, 5)}` : ''}` : '';
      case 'animators':
        return ev.animators;
      case 'show_program':
        return ev.show_program;
      case 'contractors':
        return ev.contractors;
      case 'photo':
        return ev.photo_video;
      case 'video':
        return ev.photo_video;
      case 'notes':
        return ev.notes;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const columns = [
    { field: 'date', label: 'Дата', width: 'w-16' },
    { field: 'name', label: 'Праздник', width: 'w-48' },
    { field: 'project_owner', label: 'Чей проект?', width: 'w-32' },
    { field: 'managers', label: 'Менеджеры', width: 'w-32' },
    { field: 'location', label: 'Место', width: 'w-32' },
    { field: 'time', label: 'Время', width: 'w-24' },
    { field: 'animators', label: 'Аниматоры', width: 'w-32' },
    { field: 'show_program', label: 'Шоу/Программа', width: 'w-32' },
    { field: 'contractors', label: 'Подрядчики', width: 'w-32' },
    { field: 'photo', label: 'Фото', width: 'w-24' },
    { field: 'video', label: 'Видео', width: 'w-24' },
    { field: 'notes', label: 'Примечания', width: 'w-48' },
  ];

  return (
    <div className="overflow-auto">
      <div 
        className="min-w-max"
        style={{ 
          transform: `scale(${zoom / 100})`, 
          transformOrigin: 'top left',
          width: `${100 / (zoom / 100)}%`
        }}
      >
        <table className="w-full border-collapse border border-border calendar-table">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={cn(
                    "border border-border p-2 text-center text-xs font-medium bg-white resize-x overflow-hidden",
                    col.width,
                    getColumnColor(col.field)
                  )}
                  style={{ resize: 'horizontal', minWidth: '80px' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody>
            {displayRows.map((row, index) => (
              <tr
                key={row.event ? row.event.id : `${row.date}-empty-${index}`}
                className={cn(
                  "hover:bg-gray-50 transition-colors",
                  index % 2 === 0 ? "bg-white" : "bg-white",
                  isWeekend(row.date) && "bg-blue-50",
                  row.event && "cursor-pointer"
                )}
                onClick={() => row.event && onEventEdit(row.event)}
              >
                {columns.map((col) => (
                  <td
                    key={col.field}
                    className={cn(
                      "border border-border p-1 text-xs text-center align-middle bg-white min-h-8",
                      col.field === 'date' && "sticky left-0 z-5 bg-white",
                      getColumnColor(col.field)
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words flex items-center justify-center min-h-6">
                      {getFieldValue(row, col.field)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarTable;