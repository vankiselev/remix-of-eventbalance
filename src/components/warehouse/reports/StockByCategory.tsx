import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";
import { WarehouseCategory } from "@/hooks/useWarehouseCategories";
import { WarehouseCategoryIcon } from "@/components/warehouse/items/WarehouseCategoryIcon";

interface StockByCategoryProps {
  items: WarehouseItemWithStock[];
  categories: WarehouseCategory[];
}

export const StockByCategory = ({ items, categories }: StockByCategoryProps) => {
  // Group items by category
  const categoryStats = categories.map(category => {
    const categoryItems = items.filter(item => item.category_id === category.id);
    const totalQuantity = categoryItems.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
    const totalValue = categoryItems.reduce((sum, item) => 
      sum + (item.total_quantity || 0) * item.price, 0
    );
    const lowStockCount = categoryItems.filter(item => 
      (item.total_quantity || 0) < item.min_stock
    ).length;

    return {
      category,
      itemCount: categoryItems.length,
      totalQuantity,
      totalValue,
      lowStockCount,
    };
  }).filter(stat => stat.itemCount > 0);

  // Calculate totals
  const grandTotal = categoryStats.reduce((sum, stat) => sum + stat.totalQuantity, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Остатки по категориям</CardTitle>
        <CardDescription>
          Распределение товаров по категориям
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Нет данных для отображения
          </p>
        ) : (
          categoryStats.map((stat) => {
            const percentage = grandTotal > 0 ? (stat.totalQuantity / grandTotal) * 100 : 0;

            return (
              <div key={stat.category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <WarehouseCategoryIcon
                      icon_type={stat.category.icon_type}
                      icon_value={stat.category.icon_value}
                      bg_color={stat.category.bg_color}
                      icon_color={stat.category.icon_color}
                    />
                    <div>
                      <p className="font-medium">{stat.category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.itemCount} позиций
                        {stat.lowStockCount > 0 && (
                          <span className="text-destructive ml-2">
                            • {stat.lowStockCount} с низким остатком
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{stat.totalQuantity} шт</p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(stat.totalValue)}
                    </p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
