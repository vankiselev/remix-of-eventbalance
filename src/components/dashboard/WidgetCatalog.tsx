import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WIDGET_DEFINITIONS, WidgetType, WidgetConfig } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Cake, Palmtree, User, Wallet, Banknote, CheckSquare, Bell 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Cake,
  Palmtree,
  User,
  Wallet,
  Banknote,
  CheckSquare,
  Bell,
};

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (type: WidgetType) => void;
  existingWidgets: WidgetConfig[];
}

export function WidgetCatalog({ open, onOpenChange, onAddWidget, existingWidgets }: WidgetCatalogProps) {
  const existingTypes = new Set(existingWidgets.map(w => w.type));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить виджет</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {Object.values(WIDGET_DEFINITIONS).map((widget) => {
            const Icon = iconMap[widget.icon];
            const isAdded = existingTypes.has(widget.type);

            return (
              <Card
                key={widget.type}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  isAdded && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                  if (!isAdded) {
                    onAddWidget(widget.type);
                    onOpenChange(false);
                  }
                }}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    {Icon && <Icon className="h-6 w-6 text-primary" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{widget.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
                  </div>
                  {isAdded && (
                    <Badge variant="secondary" className="text-xs">Добавлен</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
