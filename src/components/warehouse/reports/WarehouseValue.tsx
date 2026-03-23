import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";
import { WarehouseCategory } from "@/hooks/useWarehouseCategories";
import { DollarSign, TrendingUp, Package } from "lucide-react";

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
});

interface WarehouseValueProps {
  items: WarehouseItemWithStock[];
  categories: WarehouseCategory[];
}

export const WarehouseValue = ({ items, categories }: WarehouseValueProps) => {
  const { categoryValues, totalValue, topItems } = useMemo(() => {
    const catValues = categories.map(category => {
      const categoryItems = items.filter(item => item.category_id === category.id);
      const value = categoryItems.reduce((sum, item) => 
        sum + (item.total_quantity || 0) * item.price, 0
      );
      return { category, value, itemCount: categoryItems.length };
    })
    .filter(cv => cv.value > 0)
    .sort((a, b) => b.value - a.value);

    const total = catValues.reduce((sum, cv) => sum + cv.value, 0);

    const top = [...items]
      .map(item => ({ ...item, value: (item.total_quantity || 0) * item.price }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { categoryValues: catValues, totalValue: total, topItems: top };
  }, [items, categories]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Total Value */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Общая стоимость склада
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(totalValue)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Суммарная стоимость всех товаров на складе
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Value by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Стоимость по категориям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryValues.slice(0, 5).map((cv) => {
              const percentage = totalValue > 0 ? (cv.value / totalValue) * 100 : 0;

              return (
                <div key={cv.category.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{cv.category.name}</span>
                    <span className="text-sm font-bold">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(cv.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Most Valuable Items */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Топ-10 самых дорогих товаров
          </CardTitle>
          <CardDescription>
            Товары с наибольшей суммарной стоимостью
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topItems.map((item, index) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.total_quantity} {item.unit} × {' '}
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(item.price)}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                  }).format(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
