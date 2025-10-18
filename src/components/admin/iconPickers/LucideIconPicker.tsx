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
    
    // Карта ключевых слов -> иконки (больше вариантов для каждой категории)
    const iconMap: Record<string, string[]> = {
      // Финансовые категории
      'комисс|процент|агент': ['Handshake', 'Percent', 'DollarSign', 'TrendingUp', 'Receipt', 'Wallet', 'PiggyBank', 'BadgeDollarSign', 'CreditCard', 'Coins', 'Banknote', 'Calculator'],
      'зарплат|оклад|выплат': ['Banknote', 'Wallet', 'CreditCard', 'CircleDollarSign', 'HandCoins', 'DollarSign', 'Euro', 'PiggyBank', 'BadgeDollarSign', 'Receipt', 'Coins', 'WalletCards'],
      'аренд': ['Building2', 'Home', 'Warehouse', 'Store', 'KeyRound', 'DoorOpen', 'Building', 'House', 'Hotel', 'Factory', 'Castle', 'Church'],
      'налог|сбор|пошлин': ['Receipt', 'FileText', 'Calculator', 'Stamp', 'ScrollText', 'FileSpreadsheet', 'FileCheck', 'ClipboardList', 'Scale', 'Gavel'],
      'транспорт|доставк|перевозк|логистик': ['Truck', 'Car', 'Bus', 'Bike', 'Ship', 'Plane', 'Train', 'TramFront', 'Sailboat', 'Rocket', 'MapPin', 'Navigation'],
      'бензин|топлив|газ': ['Fuel', 'Droplet', 'CircleDot', 'Gauge', 'Flame', 'Zap', 'Battery', 'BatteryCharging'],
      
      // События и развлечения
      'аниматор|шоу|программ|артист': ['PartyPopper', 'Sparkles', 'Drama', 'Users', 'Mic2', 'Star', 'Mic', 'Theater', 'Music', 'Trophy', 'Award', 'Crown', 'Wand2', 'Stars', 'Smile', 'Heart', 'Laugh'],
      'фото|видео|съемк': ['Camera', 'Video', 'Film', 'Clapperboard', 'Image', 'Images', 'VideoOff', 'CameraOff', 'Aperture', 'Focus', 'ScanFace', 'GalleryHorizontal'],
      'музык|звук|dj': ['Music', 'Mic', 'Radio', 'Volume2', 'Headphones', 'Music2', 'Music3', 'Music4', 'Disc', 'Disc2', 'Disc3', 'AudioLines', 'AudioWaveform'],
      'декор|украшен|оформлен': ['Sparkles', 'Paintbrush', 'Palette', 'Brush', 'Wand2', 'Flower', 'Flower2', 'Stars', 'Heart', 'Gift', 'Ribbon', 'Sparkle'],
      'торт|сладост|еда|питан|кейтер': ['Cake', 'UtensilsCrossed', 'Cookie', 'IceCream', 'Pizza', 'CakeSlice', 'Cherry', 'Apple', 'Beef', 'Coffee', 'Wine', 'Beer'],
      'цвет|букет|растен': ['Flower2', 'Leaf', 'Trees', 'Sprout', 'Flower', 'TreePine', 'TreeDeciduous', 'Palmtree', 'Clover', 'Cherry'],
      
      // Оборудование
      'оборудован|техник|аппарат': ['Box', 'Package', 'HardHat', 'Cog', 'Settings', 'Wrench', 'Hammer', 'Drill', 'Settings2', 'Tool', 'Package2', 'PackageOpen'],
      'свет|освещ': ['Lightbulb', 'Lamp', 'Sun', 'Flashlight', 'Sunrise', 'Sunset', 'Moon', 'LampDesk', 'LampCeiling', 'Torch'],
      'мебел|стул|стол': ['Armchair', 'Sofa', 'Table', 'LampDesk', 'Bed', 'BedDouble', 'Chair', 'DoorClosed', 'DoorOpen'],
      'костюм|одежд|наряд': ['Shirt', 'Glasses', 'Crown', 'Watch', 'Footprints', 'ShoppingBag', 'Gem', 'Diamond'],
      
      // Маркетинг и реклама
      'реклам|маркетинг|промо': ['Megaphone', 'TrendingUp', 'BarChart3', 'Target', 'Presentation', 'Speaker', 'Loudspeaker', 'MessageSquare', 'Share2', 'TrendingDown', 'LineChart', 'PieChart'],
      'печат|полиграф|баннер': ['Printer', 'FileImage', 'Image', 'Layout', 'Images', 'FileType', 'StickyNote', 'Ticket'],
      'дизайн|график': ['Palette', 'Paintbrush', 'PenTool', 'Figma', 'Layers', 'Brush', 'Eraser', 'Pencil', 'PenLine', 'Pipette'],
      
      // Услуги
      'уборк|чистк|клининг': ['Brush', 'Sparkles', 'Trash2', 'Broom', 'Trash', 'Droplets', 'Spray', 'Wind'],
      'охран|безопасн': ['Shield', 'ShieldCheck', 'Lock', 'Eye', 'AlertTriangle', 'ShieldAlert', 'KeyRound', 'Key', 'LockKeyhole', 'ShieldBan'],
      'страхов|гарант': ['ShieldCheck', 'FileCheck', 'ScrollText', 'BadgeCheck', 'Shield', 'FileBadge', 'Award', 'CheckCircle'],
      'консульт|услуг|сервис': ['MessageCircle', 'HelpCircle', 'Info', 'UserCog', 'Users', 'MessageSquare', 'HeadphonesIcon', 'Phone', 'Mail'],
      
      // Административные расходы
      'офис|канцеляр': ['Briefcase', 'FileText', 'Pen', 'Paperclip', 'Folder', 'FolderOpen', 'File', 'Files', 'Notebook', 'BookOpen'],
      'связь|интернет|телефон': ['Phone', 'Wifi', 'Globe', 'Signal', 'Antenna', 'Smartphone', 'PhoneCall', 'Mail', 'MessageSquare', 'Send'],
      'програм|софт|лицензи': ['Code', 'Terminal', 'Laptop', 'MonitorCheck', 'Monitor', 'Computer', 'Server', 'Database', 'HardDrive'],
      
      // Прочее
      'возврат|компенсац|возмещ': ['RotateCcw', 'RefreshCw', 'Undo2', 'ArrowLeftCircle', 'Undo', 'ArrowLeft', 'Reply', 'CornerUpLeft'],
      'штраф|пеня|санкц': ['XCircle', 'AlertTriangle', 'Ban', 'ShieldAlert', 'X', 'AlertOctagon', 'OctagonAlert', 'TriangleAlert'],
      'подарок|приз|бонус': ['Gift', 'Award', 'Trophy', 'Star', 'Sparkles', 'Stars', 'Crown', 'Medal', 'BadgeCheck', 'Heart'],
    };
    
    // Ищем совпадения по ключевым словам
    for (const [keywords, icons] of Object.entries(iconMap)) {
      const patterns = keywords.split('|');
      if (patterns.some(pattern => name.includes(pattern))) {
        // Убираем дубликаты
        return Array.from(new Set(icons));
      }
    }
    
    // Если не нашли специфичные - популярные общие иконки
    return [
      'Package', 'DollarSign', 'Settings', 'Star', 'CheckCircle', 'Info',
      'Home', 'User', 'Users', 'Calendar', 'Clock', 'MapPin',
      'Mail', 'Phone', 'MessageSquare', 'Bell', 'Heart', 'Bookmark',
      'Tag', 'Folder', 'File', 'Image', 'Video', 'Music'
    ];
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
      // Если нет запроса — показываем подобранные для категории + дополнительные популярные
      if (validRelevantIcons.length > 0) {
        // Добавляем к релевантным еще популярные иконки (до 150 всего)
        const additionalIcons = allLucideIconNames
          .filter(name => !validRelevantIcons.includes(name))
          .slice(0, 150 - validRelevantIcons.length);
        return [...validRelevantIcons, ...additionalIcons];
      }
      return allLucideIconNames.slice(0, 150);
    }

    const searchLower = search.toLowerCase();
    return allLucideIconNames
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 200);
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

      <ScrollArea className="h-[500px] rounded-md border p-4">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {filteredIcons.map(renderIcon)}
        </div>
        {filteredIcons.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Показано {filteredIcons.length} иконок
          </p>
        )}
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
