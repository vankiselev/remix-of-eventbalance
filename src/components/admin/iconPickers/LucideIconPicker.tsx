import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

interface LucideIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const LucideIconPicker = ({ selectedIcon, onSelectIcon }: LucideIconPickerProps) => {
  const [search, setSearch] = useState("");

  // Popular finance-related icons
  const popularIcons = [
    'Wallet', 'DollarSign', 'CreditCard', 'Banknote', 'TrendingUp', 'TrendingDown',
    'ShoppingCart', 'ShoppingBag', 'Receipt', 'Calculator', 'PiggyBank', 'Coins',
    'User', 'Users', 'Building', 'Home', 'Package', 'Box',
    'Wrench', 'Tool', 'Settings', 'Zap', 'Star', 'Heart',
    'FileText', 'Clipboard', 'Calendar', 'Clock', 'Tag', 'Percent',
  ];

  const filteredIcons = useMemo(() => {
    if (!search) return popularIcons;
    
    const searchLower = search.toLowerCase();
    return Object.keys(Icons)
      .filter(name => 
        name !== 'createLucideIcon' && 
        name !== 'default' &&
        name.toLowerCase().includes(searchLower)
      )
      .slice(0, 50);
  }, [search]);

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    if (!IconComponent || typeof IconComponent !== 'function') return null;

    return (
      <Button
        key={iconName}
        variant={selectedIcon === iconName ? "default" : "outline"}
        className="h-20 w-20 flex flex-col items-center justify-center gap-2 p-2"
        onClick={() => onSelectIcon(iconName)}
      >
        <IconComponent className="h-6 w-6" />
        <span className="text-[10px] truncate w-full text-center">{iconName}</span>
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск иконок..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {filteredIcons.map(renderIcon)}
        </div>
      </ScrollArea>

      {selectedIcon && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Выбрано:</span>
          <span className="font-medium">{selectedIcon}</span>
        </div>
      )}
    </div>
  );
};
