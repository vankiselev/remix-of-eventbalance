import { useState, useCallback, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import { Plus, Settings, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetWrapper } from './WidgetWrapper';
import { WidgetCatalog } from './WidgetCatalog';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { WidgetConfig, WIDGET_DEFINITIONS } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

// Widget components
import TodayEventsCard from './TodayEventsCard';
import TodayBirthdaysCard from './TodayBirthdaysCard';
import TodayVacationsCard from './TodayVacationsCard';
import MyEventsCard from './MyEventsCard';
import CashOnHandCard from './CashOnHandCard';
import { AdvancesDashboardCard } from './AdvancesDashboardCard';
import { EventActionRequestsCard } from './EventActionRequestsCard';
import { TasksWidget } from './widgets/TasksWidget';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// @ts-ignore - react-grid-layout types are incomplete
const ReactGridLayout = GridLayout.WidthProvider ? GridLayout.WidthProvider(GridLayout) : GridLayout;

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

const ROW_HEIGHT = 120;
const MARGIN: [number, number] = [16, 16];

const widgetComponents: Record<string, React.ComponentType<{ compact?: boolean }>> = {
  events: TodayEventsCard,
  birthdays: TodayBirthdaysCard,
  vacations: TodayVacationsCard,
  my_events: MyEventsCard,
  cash: CashOnHandCard,
  advances: AdvancesDashboardCard,
  tasks: TasksWidget,
  action_requests: EventActionRequestsCard,
};

export function WidgetGrid() {
  const { layout, saveLayout, resetLayout, isLoading, isSaving } = useDashboardLayout();
  const [isEditing, setIsEditing] = useState(false);
  const [tempLayout, setTempLayout] = useState<WidgetConfig[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const handleStartEditing = useCallback(() => {
    setTempLayout([...layout]);
    setIsEditing(true);
  }, [layout]);

  const handleCancelEditing = useCallback(() => {
    setTempLayout([]);
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    await saveLayout(tempLayout);
    setIsEditing(false);
    setTempLayout([]);
  }, [saveLayout, tempLayout]);

  const handleLayoutChange = useCallback((newGridLayout: LayoutItem[]) => {
    if (!isEditing) return;
    setTempLayout(prev => prev.map(widget => {
      const gridItem = newGridLayout.find(item => item.i === widget.id);
      if (gridItem) {
        return { ...widget, x: gridItem.x, y: gridItem.y, w: gridItem.w, h: gridItem.h };
      }
      return widget;
    }));
  }, [isEditing]);

  const handleAddWidget = useCallback((type: WidgetConfig['type']) => {
    const def = WIDGET_DEFINITIONS[type];
    const newWidget: WidgetConfig = {
      id: crypto.randomUUID(),
      type,
      x: 0,
      y: Infinity,
      w: def.defaultW,
      h: def.defaultH,
    };
    setTempLayout(prev => [...prev, newWidget]);
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setTempLayout(prev => prev.filter(w => w.id !== id));
  }, []);

  const currentLayout = isEditing ? tempLayout : layout;
  const gridLayout: LayoutItem[] = useMemo(() => 
    currentLayout.map(widget => {
      const def = WIDGET_DEFINITIONS[widget.type];
      return {
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: def.minW,
        minH: def.minH,
        maxW: def.maxW,
        maxH: def.maxH,
      };
    }), [currentLayout]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="col-span-2 h-[360px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex justify-end gap-2 mb-4">
        {isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
            <Button variant="outline" size="sm" onClick={resetLayout}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelEditing}>
              <X className="h-4 w-4 mr-1" />
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartEditing}>
            <Settings className="h-4 w-4 mr-1" />
            Настроить
          </Button>
        )}
      </div>

      <ReactGridLayout
        className="layout"
        layout={gridLayout}
        cols={4}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".cursor-grab"
        useCSSTransforms
      >
        {currentLayout.map(widget => {
          const WidgetComponent = widgetComponents[widget.type];
          if (!WidgetComponent) return null;
          return (
            <div key={widget.id} className="relative">
              <WidgetWrapper isEditing={isEditing} onRemove={() => handleRemoveWidget(widget.id)}>
                <WidgetComponent compact={widget.w < 2 || widget.h < 2} />
              </WidgetWrapper>
            </div>
          );
        })}
      </ReactGridLayout>

      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onAddWidget={handleAddWidget}
        existingWidgets={tempLayout}
      />
    </div>
  );
}
