import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CollapsibleFiltersProps {
  children: React.ReactNode;
  activeCount?: number;
}

export const CollapsibleFilters = ({ children, activeCount = 0 }: CollapsibleFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-9 text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Фильтры</span>
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center font-bold leading-none tabular-nums">
                {activeCount}
              </span>
            )}
          </div>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
