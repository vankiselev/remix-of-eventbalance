import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Package } from "lucide-react";

interface WarehouseCategoryIconProps {
  icon_type: string;
  icon_value: string;
  bg_color: string;
  icon_color: string;
}

export const WarehouseCategoryIcon = ({
  icon_type,
  icon_value,
  bg_color,
  icon_color,
}: WarehouseCategoryIconProps) => {
  const renderIcon = () => {
    if (icon_type === 'lucide') {
      const IconComponent = Icons[icon_value as keyof typeof Icons] as React.ComponentType<LucideProps>;
      if (IconComponent) {
        return <IconComponent className={`w-4 h-4 ${icon_color}`} />;
      }
      return <Package className={`w-4 h-4 ${icon_color}`} />;
    }

    if (icon_type === 'upload' || icon_type === 'url') {
      return (
        <img
          src={icon_value}
          alt="Category icon"
          className={`w-4 h-4 object-contain`}
        />
      );
    }

    return <Package className={`w-4 h-4 ${icon_color}`} />;
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bg_color}`}>
      {renderIcon()}
    </div>
  );
};
