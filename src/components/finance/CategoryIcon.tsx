import { 
  Wallet, 
  User, 
  ShoppingCart, 
  Building, 
  Wrench, 
  Package,
  TrendingUp,
  CreditCard
} from "lucide-react";

interface CategoryIconProps {
  category: string;
  isIncome: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: any; bgColor: string; iconColor: string }> = {
  // Расходы
  'Зарплата': { icon: User, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
  'Закупки': { icon: ShoppingCart, bgColor: 'bg-orange-500/10', iconColor: 'text-orange-600 dark:text-orange-400' },
  'Аренда': { icon: Building, bgColor: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
  'Услуги': { icon: Wrench, bgColor: 'bg-yellow-500/10', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  'Прочее': { icon: Package, bgColor: 'bg-gray-500/10', iconColor: 'text-gray-600 dark:text-gray-400' },
  
  // Доходы
  'От клиентов': { icon: Wallet, bgColor: 'bg-green-500/10', iconColor: 'text-green-600 dark:text-green-400' },
  'Аванс': { icon: CreditCard, bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  'Другое': { icon: TrendingUp, bgColor: 'bg-teal-500/10', iconColor: 'text-teal-600 dark:text-teal-400' },
};

export const CategoryIcon = ({ category, isIncome }: CategoryIconProps) => {
  const config = CATEGORY_CONFIG[category] || (isIncome 
    ? { icon: Wallet, bgColor: 'bg-green-500/10', iconColor: 'text-green-600 dark:text-green-400' }
    : { icon: Package, bgColor: 'bg-gray-500/10', iconColor: 'text-gray-600 dark:text-gray-400' }
  );
  
  const Icon = config.icon;

  return (
    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center ${config.bgColor}`}>
      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${config.iconColor}`} />
    </div>
  );
};

export const getCategoryColor = (category: string, isIncome: boolean): string => {
  const colorMap: Record<string, string> = {
    'Зарплата': 'hsl(217, 91%, 60%)',
    'Закупки': 'hsl(25, 95%, 53%)',
    'Аренда': 'hsl(271, 91%, 65%)',
    'Услуги': 'hsl(48, 96%, 53%)',
    'Прочее': 'hsl(220, 9%, 46%)',
    'От клиентов': 'hsl(142, 76%, 36%)',
    'Аванс': 'hsl(152, 76%, 36%)',
    'Другое': 'hsl(173, 76%, 36%)',
  };
  
  return colorMap[category] || (isIncome ? 'hsl(142, 76%, 36%)' : 'hsl(220, 9%, 46%)');
};
