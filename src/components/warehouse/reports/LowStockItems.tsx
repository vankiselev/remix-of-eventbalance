import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";
import { AlertTriangle } from "lucide-react";

interface LowStockItemsProps {
  items: WarehouseItemWithStock[];
}

export const LowStockItems = ({ items }: LowStockItemsProps) => {
  const lowStockItems = items
    .filter(item => (item.total_quantity || 0) < item.min_stock)
    .sort((a, b) => {
      const aPercentage = ((a.total_quantity || 0) / a.min_stock) * 100;
      const bPercentage = ((b.total_quantity || 0) / b.min_stock) * 100;
      return aPercentage - bPercentage;
    });

  const getSeverity = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage === 0) return { color: 'destructive', label: 'Отсутствует' };
    if (percentage < 25) return { color: 'destructive', label: 'Критический' };
    if (percentage < 50) return { color: 'orange', label: 'Низкий' };
    return { color: 'yellow', label: 'Требует внимания' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle>Товары с низким остатком</CardTitle>
            <CardDescription>
              {lowStockItems.length} позиций требуют пополнения
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Все товары в достаточном количестве
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lowStockItems.map((item) => {
              const percentage = ((item.total_quantity || 0) / item.min_stock) * 100;
              const severity = getSeverity(item.total_quantity || 0, item.min_stock);

              return (
                <div key={item.id} className="space-y-2 p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <Badge variant={severity.color === 'destructive' ? 'destructive' : 'outline'}>
                          {severity.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.sku}
                        {item.category_name && (
                          <span className="ml-2">• {item.category_name}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {item.total_quantity || 0} / {item.min_stock}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}% от минимального остатка
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
