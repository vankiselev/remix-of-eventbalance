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

  // Иконки специально подобранные для ваших категорий
  const popularIcons = [
    // Финансы и выплаты
    'Handshake', 'Banknote', 'DollarSign', 'Wallet', 'CreditCard', 'ArrowRightLeft', 'Calculator',
    // События и развлечения
    'PartyPopper', 'Mic2', 'Video', 'Camera', 'Music', 'Drama', 'Cake',
    // Оборудование и аренда
    'Box', 'Package', 'ShoppingBag', 'ShoppingCart', 'Building2', 'HardHat', 'Cog',
    // Люди и команда
    'UsersRound', 'User', 'UserCog', 'Users', 'UserPlus', 'UserCircle',
    // Доставка и логистика
    'Truck', 'Car', 'Ship', 'Plane', 'MapPin', 'Navigation',
    // Документы и печать
    'Printer', 'FileText', 'FileWarning', 'File', 'Folder', 'Paperclip',
    // Дизайн и творчество
    'Paintbrush', 'Palette', 'Brush', 'Wand2', 'Sparkles', 'ImagePlus',
    // Безопасность и гарантии
    'ShieldCheck', 'Shield', 'Lock', 'Key', 'ShieldAlert',
    // Возврат и обмен
    'RefreshCw', 'RotateCcw', 'Repeat', 'Undo2',
    // Запрет и ограничения
    'XCircle', 'X', 'Ban', 'AlertCircle', 'AlertTriangle',
    // Разное
    'Settings', 'Tool', 'Wrench', 'Zap', 'Star', 'Heart', 'ThumbsUp', 'Check',
  ];

  // Все доступные иконки lucide-react (только валидные компоненты)
  const allLucideIconNames = useMemo(() => {
    return Object.entries(Icons)
      .filter(([name, value]) =>
        name !== 'createLucideIcon' &&
        name !== 'default' &&
        typeof value === 'function'
      )
      .map(([name]) => name);
  }, []);

  const filteredIcons = useMemo(() => {
    // Фильтруем popularIcons, чтобы оставить только существующие
    const validPopularIcons = popularIcons.filter(name => {
      const IconComponent = Icons[name as keyof typeof Icons];
      return IconComponent && typeof IconComponent === 'function';
    });

    if (!search) {
      // Если нет запроса — показываем подобранные, иначе общий список
      return validPopularIcons.length
        ? validPopularIcons
        : allLucideIconNames.slice(0, 96);
    }

    const searchLower = search.toLowerCase();
    return allLucideIconNames
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 100);
  }, [search, allLucideIconNames]);

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
