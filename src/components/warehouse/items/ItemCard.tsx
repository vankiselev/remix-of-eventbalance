import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Package, AlertCircle } from "lucide-react";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";
import { WarehouseCategoryIcon } from "./WarehouseCategoryIcon";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";

interface ItemCardProps {
  item: WarehouseItemWithStock;
  onEdit: (itemId: string) => void;
}

export const ItemCard = ({ item, onEdit }: ItemCardProps) => {
  const { categoryIcons } = useCategoryIcons();
  const categoryIcon = categoryIcons.find(
    (icon) => icon.category_name === item.category_name
  );
  
  const totalQuantity = item.total_quantity || 0;
  const isLowStock = totalQuantity < item.min_stock;
  const stockStatus = totalQuantity === 0 ? 'out' : isLowStock ? 'low' : 'ok';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        {item.photo_url ? (
          <div className="aspect-square overflow-hidden bg-muted">
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center bg-muted">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold line-clamp-2 flex-1">{item.name}</h3>
            {stockStatus !== 'ok' && (
              <AlertCircle
                className={`h-4 w-4 flex-shrink-0 ${
                  stockStatus === 'out' ? 'text-destructive' : 'text-orange-500'
                }`}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {item.category_name && categoryIcon && (
            <WarehouseCategoryIcon
              icon_type={categoryIcon.icon_type}
              icon_value={categoryIcon.icon_value}
              bg_color={categoryIcon.bg_color}
              icon_color={categoryIcon.icon_color}
            />
          )}
          {item.category_name && (
            <span className="text-xs text-muted-foreground">
              {item.category_name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Остаток</p>
            <p className={`text-lg font-bold ${
              stockStatus === 'out' ? 'text-destructive' :
              stockStatus === 'low' ? 'text-orange-500' :
              'text-primary'
            }`}>
              {totalQuantity} {item.unit}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Минимум</p>
            <p className="text-sm font-medium">{item.min_stock} {item.unit}</p>
          </div>
        </div>

        {item.purchase_price > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Цена закупки</p>
            <p className="text-sm font-medium">{item.purchase_price} ₽</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onEdit(item.id)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Редактировать
        </Button>
      </CardFooter>
    </Card>
  );
};
