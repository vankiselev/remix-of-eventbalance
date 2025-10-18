import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

interface LucideIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  categoryName?: string;
}

export const LucideIconPicker = ({ selectedIcon, onSelectIcon, categoryName }: LucideIconPickerProps) => {
  const [search, setSearch] = useState("");

  // Умная подборка иконок на основе названия категории
  const getRelevantIcons = (categoryName?: string): string[] => {
    if (!categoryName) return [];
    
    const name = categoryName.toLowerCase();
    
    // Карта ключевых слов -> иконки
    const iconMap: Record<string, string[]> = {
      // Финансовые категории
      'комисс|процент|агент': ['Handshake', 'Percent', 'DollarSign', 'TrendingUp', 'Receipt', 'Wallet'],
      'зарплат|оклад|выплат': ['Banknote', 'Wallet', 'CreditCard', 'CircleDollarSign', 'HandCoins'],
      'аренд': ['Building2', 'Home', 'Warehouse', 'Store', 'KeyRound', 'DoorOpen'],
      'налог|сбор|пошлин': ['Receipt', 'FileText', 'Calculator', 'Stamp', 'ScrollText'],
      'транспорт|доставк|перевозк|логистик': ['Truck', 'Car', 'Bus', 'Bike', 'Ship', 'Plane'],
      'бензин|топлив|газ': ['Fuel', 'Droplet', 'CircleDot', 'Gauge'],
      
      // События и развлечения
      'аниматор|шоу|программ|артист': ['PartyPopper', 'Sparkles', 'Drama', 'Users', 'Mic2', 'Star'],
      'фото|видео|съемк': ['Camera', 'Video', 'Film', 'Clapperboard', 'Image'],
      'музык|звук|dj': ['Music', 'Mic', 'Radio', 'Volume2', 'Headphones'],
      'декор|украшен|оформлен': ['Sparkles', 'Paintbrush', 'Palette', 'Brush', 'Wand2'],
      'торт|сладост|еда|питан|кейтер': ['Cake', 'UtensilsCrossed', 'Cookie', 'IceCream', 'Pizza'],
      'цвет|букет|растен': ['Flower2', 'Leaf', 'Trees', 'Sprout'],
      
      // Оборудование
      'оборудован|техник|аппарат': ['Box', 'Package', 'HardHat', 'Cog', 'Settings', 'Wrench'],
      'свет|освещ': ['Lightbulb', 'Lamp', 'Sun', 'Flashlight'],
      'мебел|стул|стол': ['Armchair', 'Sofa', 'Table', 'LampDesk'],
      'костюм|одежд|наряд': ['Shirt', 'Glasses', 'Crown', 'Watch'],
      
      // Маркетинг и реклама
      'реклам|маркетинг|промо': ['Megaphone', 'TrendingUp', 'BarChart3', 'Target', 'Presentation'],
      'печат|полиграф|баннер': ['Printer', 'FileImage', 'Image', 'Layout'],
      'дизайн|график': ['Palette', 'Paintbrush', 'PenTool', 'Figma', 'Layers'],
      
      // Услуги
      'уборк|чистк|клининг': ['Brush', 'Sparkles', 'Trash2', 'Broom'],
      'охран|безопасн': ['Shield', 'ShieldCheck', 'Lock', 'Eye', 'AlertTriangle'],
      'страхов|гарант': ['ShieldCheck', 'FileCheck', 'ScrollText', 'BadgeCheck'],
      'консульт|услуг|сервис': ['MessageCircle', 'HelpCircle', 'Info', 'UserCog'],
      
      // Административные расходы
      'офис|канцеляр': ['Briefcase', 'FileText', 'Pen', 'Paperclip', 'Folder'],
      'связь|интернет|телефон': ['Phone', 'Wifi', 'Globe', 'Signal', 'Antenna'],
      'програм|софт|лицензи': ['Code', 'Terminal', 'Laptop', 'MonitorCheck'],
      
      // Прочее
      'возврат|компенсац|возмещ': ['RotateCcw', 'RefreshCw', 'Undo2', 'ArrowLeftCircle'],
      'штраф|пеня|санкц': ['XCircle', 'AlertTriangle', 'Ban', 'ShieldAlert'],
      'подарок|приз|бонус': ['Gift', 'Award', 'Trophy', 'Star', 'Sparkles'],
    };
    
    // Ищем совпадения по ключевым словам
    for (const [keywords, icons] of Object.entries(iconMap)) {
      const patterns = keywords.split('|');
      if (patterns.some(pattern => name.includes(pattern))) {
        return icons;
      }
    }
    
    // Если не нашли специфичные - общие иконки
    return ['Package', 'DollarSign', 'Settings', 'Star', 'CheckCircle', 'Info'];
  };
  
  const relevantIcons = useMemo(() => 
    getRelevantIcons(categoryName), 
    [categoryName]
  );

  // Все доступные иконки lucide-react (только валидные компоненты)
  const allLucideIconNames = useMemo(() => {
    // В lucide-react иконки экспортируются как компоненты через forwardRef (typeof === 'object')
    // Отфильтруем только названия, похожие на иконки, исключая служебные экспорты
    return Object.keys(Icons).filter((name) =>
      /^[A-Z]/.test(name) &&
      name !== 'Icon' &&
      name !== 'icons' &&
      name !== 'createLucideIcon' &&
      name !== 'default' &&
      name !== 'LucideProps' &&
      name !== 'IconNode'
    );
  }, []);

  const filteredIcons = useMemo(() => {
    // Фильтруем релевантные иконки, чтобы оставить только существующие
    const validRelevantIcons = relevantIcons.filter((name) => {
      const IconComponent = Icons[name as keyof typeof Icons] as any;
      return !!IconComponent;
    });

    if (!search) {
      // Если нет запроса — показываем подобранные для категории
      return validRelevantIcons.length > 0
        ? validRelevantIcons
        : allLucideIconNames.slice(0, 96);
    }

    const searchLower = search.toLowerCase();
    return allLucideIconNames
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 100);
  }, [search, allLucideIconNames, relevantIcons]);

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    if (!IconComponent) return null;

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
