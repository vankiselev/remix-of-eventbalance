import { Minus } from 'lucide-react';
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
        "widget-wrapper h-full w-full bg-card rounded-xl border shadow-sm overflow-hidden transition-all duration-200",
        isEditing && "cursor-move",
        className
      )}
    >
      {isEditing && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute -top-2 -left-2 z-10 h-6 w-6 rounded-full bg-muted-foreground hover:bg-muted-foreground/80 text-background border-2 border-background shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Minus className="h-3 w-3 stroke-[3]" />
        </Button>
      )}
      <div className={cn("h-full w-full", isEditing && "pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}
