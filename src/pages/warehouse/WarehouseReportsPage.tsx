import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { useWarehouseCategories } from "@/hooks/useWarehouseCategories";
import { useWarehouseMovements } from "@/hooks/useWarehouseMovements";
import { useWarehouseTasks } from "@/hooks/useWarehouseTasks";
import { StockByCategory } from "@/components/warehouse/reports/StockByCategory";
import { LowStockItems } from "@/components/warehouse/reports/LowStockItems";
import { IssuedItems } from "@/components/warehouse/reports/IssuedItems";
import { WarehouseValue } from "@/components/warehouse/reports/WarehouseValue";
import { MovementHistory } from "@/components/warehouse/reports/MovementHistory";
import { Package, AlertTriangle, TrendingUp, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const WarehouseReportsPage = () => {
  const { items, isLoading: itemsLoading } = useWarehouseItems();
  const { categories, isLoading: categoriesLoading } = useWarehouseCategories();
  const { movements, isLoading: movementsLoading } = useWarehouseMovements();
  const { tasks, isLoading: tasksLoading } = useWarehouseTasks();

  const isLoading = itemsLoading || categoriesLoading || movementsLoading || tasksLoading;

  // Calculate summary stats
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
  const lowStockCount = items.filter(item => 
    (item.total_quantity || 0) < item.min_stock
  ).length;
  const totalValue = items.reduce((sum, item) => 
    sum + (item.total_quantity || 0) * item.purchase_price, 0
  );
  const issuedItemsCount = tasks.filter(t => 
    t.status === 'in_progress' && t.task_type === 'collection'
  ).length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Отчёты склада</h1>
        <p className="text-muted-foreground">
          Аналитика и статистика по складу
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего позиций</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Общее количество: {totalQuantity} шт
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Низкий остаток</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Требуют пополнения
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выдано</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuedItemsCount}</div>
            <p className="text-xs text-muted-foreground">
              Активных задач сбора
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Стоимость склада</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Общая стоимость товаров
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="by-category" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-category">По категориям</TabsTrigger>
          <TabsTrigger value="low-stock">Низкий остаток</TabsTrigger>
          <TabsTrigger value="issued">Выданные товары</TabsTrigger>
          <TabsTrigger value="value">Стоимость</TabsTrigger>
          <TabsTrigger value="history">История движений</TabsTrigger>
        </TabsList>

        <TabsContent value="by-category" className="space-y-4">
          <StockByCategory items={items} categories={categories} />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <LowStockItems items={items} />
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <IssuedItems tasks={tasks} />
        </TabsContent>

        <TabsContent value="value" className="space-y-4">
          <WarehouseValue items={items} categories={categories} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <MovementHistory movements={movements} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
