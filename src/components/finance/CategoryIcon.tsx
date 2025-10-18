import { useMemo } from "react";
import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";
import { Package, Wallet } from "lucide-react";

interface CategoryIconProps {
  category: string;
  isIncome: boolean;
}

export const CategoryIcon = ({ category, isIncome }: CategoryIconProps) => {
  const { categoryIcons, isLoading } = useCategoryIcons();

  const iconConfig = useMemo(() => {
    if (isLoading) {
      return {
        type: 'lucide' as const,
        value: isIncome ? 'Wallet' : 'Package',
        bgColor: isIncome ? 'bg-green-500/10' : 'bg-gray-500/10',
        iconColor: isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400',
      };
    }

    const customIcon = categoryIcons.find(icon => icon.category_name === category);
    
    if (customIcon) {
      return {
        type: customIcon.icon_type,
        value: customIcon.icon_value,
        bgColor: customIcon.bg_color,
        iconColor: customIcon.icon_color,
      };
    }

    // Fallback to default
    return {
      type: 'lucide' as const,
      value: isIncome ? 'Wallet' : 'Package',
      bgColor: isIncome ? 'bg-green-500/10' : 'bg-gray-500/10',
      iconColor: isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400',
    };
  }, [category, isIncome, categoryIcons, isLoading]);

  const renderIcon = () => {
    if (iconConfig.type === 'lucide') {
      const IconComponent = Icons[iconConfig.value as keyof typeof Icons] as React.ComponentType<LucideProps>;
      if (IconComponent) {
        return <IconComponent className={`w-5 h-5 md:w-6 md:h-6 ${iconConfig.iconColor}`} />;
      }
      // Fallback if icon not found
      const FallbackIcon = isIncome ? Wallet : Package;
      return <FallbackIcon className={`w-5 h-5 md:w-6 md:h-6 ${iconConfig.iconColor}`} />;
    }

    if (iconConfig.type === 'upload' || iconConfig.type === 'url') {
      return (
        <img
          src={iconConfig.value}
          alt={category}
          className={`w-5 h-5 md:w-6 md:h-6 object-contain ${iconConfig.iconColor}`}
        />
      );
    }

    return null;
  };

  return (
    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center ${iconConfig.bgColor}`}>
      {renderIcon()}
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
