import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WidgetWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
  onRemove: () => void;
  className?: string;
}

export function WidgetWrapper({ children, isEditing, onRemove, className }: WidgetWrapperProps) {
  return (
    <div 
      className={cn(
        "h-full w-full bg-card rounded-xl border shadow-sm overflow-hidden transition-all duration-200",
        isEditing && "ring-2 ring-primary/20 cursor-move",
        className
      )}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {isEditing && (
        <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className={cn("h-full w-full", isEditing && "pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}
