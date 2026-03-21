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
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Фильтрация</span>
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
