import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { Package, FileText, CheckSquare, BarChart3 } from "lucide-react";
import { WarehouseItemsPage } from "./warehouse/WarehouseItemsPage";
import { WarehouseMovementsPage } from "./warehouse/WarehouseMovementsPage";
import WarehouseTasksPage from "./warehouse/WarehouseTasksPage";

const WarehousePage = () => {
  return (
    <Layout>
      <div className="space-y-6 w-full overflow-x-hidden">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">Склад</h1>
          <p className="text-muted-foreground truncate">
            Управление товарами, остатками и задачами
          </p>
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="items" className="flex items-center gap-2 whitespace-nowrap">
              <Package className="h-4 w-4" />
              Товары
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="h-4 w-4" />
              Движения
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 whitespace-nowrap">
              <CheckSquare className="h-4 w-4" />
              Задачи
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="h-4 w-4" />
              Отчёты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <WarehouseItemsPage />
          </TabsContent>

          <TabsContent value="movements" className="mt-6">
            <WarehouseMovementsPage />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <WarehouseTasksPage />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              Отчёты склада (в разработке)
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WarehousePage;
