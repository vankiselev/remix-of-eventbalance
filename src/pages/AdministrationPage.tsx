import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesManagement } from "@/components/roles/RolesManagement";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import { PendingUsersManagement } from "@/components/admin/PendingUsersManagement";
import { CategoryIconsManagement } from "@/components/admin/CategoryIconsManagement";
import { TransactionCategoriesManagement } from "@/components/admin/TransactionCategoriesManagement";
import { TransactionProjectsManagement } from "@/components/admin/TransactionProjectsManagement";
import { WarehouseSettingsManagement } from "@/components/admin/WarehouseSettingsManagement";
import { WarehouseCategoriesManagement } from "@/components/admin/WarehouseCategoriesManagement";
import { WarehouseLocationsManagement } from "@/components/admin/WarehouseLocationsManagement";
import { TestDataManagement } from "@/components/admin/TestDataManagement";
import { TenantsManagement } from "@/components/admin/TenantsManagement";
import { OwnerColorsManagement } from "@/components/admin/OwnerColorsManagement";
import Layout from "@/components/Layout";
import { Shield, UserPlus, Palette, Tags, FolderKanban, Settings, Package, MapPin, FlaskConical, Building2, Paintbrush } from "lucide-react";

const AdministrationPage = () => {
  return (
    <Layout>
      <div className="space-y-6 w-full overflow-x-hidden">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">Администрирование</h1>
          <p className="text-muted-foreground truncate">
            Управление системой, ролями и приглашениями
          </p>
        </div>

        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide h-auto flex-wrap sm:flex-nowrap gap-0.5 p-1">
            <TabsTrigger value="companies" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Компании</span>
              <span className="sm:hidden">Комп.</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Права
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Приглашения</span>
              <span className="sm:hidden">Пригл.</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Категории</span>
              <span className="sm:hidden">Кат.</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Проекты</span>
              <span className="sm:hidden">Проек.</span>
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Иконки</span>
              <span className="sm:hidden">Ик.</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse-categories" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Категории товаров</span>
              <span className="sm:hidden">Товары</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse-locations" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Локации</span>
              <span className="sm:hidden">Лок.</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Склад
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Тест
            </TabsTrigger>
            <TabsTrigger value="owner-colors" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 touch-manipulation">
              <Paintbrush className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Цвета</span>
              <span className="sm:hidden">Цвета</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <TenantsManagement />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">Ожидающие одобрения</TabsTrigger>
                <TabsTrigger value="email">Приглашения по email</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4">
                <PendingUsersManagement />
              </TabsContent>
              <TabsContent value="email" className="mt-4">
                <InvitationsManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <TransactionCategoriesManagement />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <TransactionProjectsManagement />
          </TabsContent>

          <TabsContent value="icons" className="mt-6">
            <CategoryIconsManagement />
          </TabsContent>

          <TabsContent value="warehouse-categories" className="mt-6">
            <WarehouseCategoriesManagement />
          </TabsContent>

          <TabsContent value="warehouse-locations" className="mt-6">
            <WarehouseLocationsManagement />
          </TabsContent>

          <TabsContent value="warehouse" className="mt-6">
            <WarehouseSettingsManagement />
          </TabsContent>

          <TabsContent value="testing" className="mt-6">
            <TestDataManagement />
          </TabsContent>

          <TabsContent value="owner-colors" className="mt-6">
            <OwnerColorsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdministrationPage;
