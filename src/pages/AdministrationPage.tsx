import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesManagement } from "@/components/roles/RolesManagement";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import { CategoryIconsManagement } from "@/components/admin/CategoryIconsManagement";
import { TransactionCategoriesManagement } from "@/components/admin/TransactionCategoriesManagement";
import { TransactionProjectsManagement } from "@/components/admin/TransactionProjectsManagement";
import Layout from "@/components/Layout";
import { Shield, UserPlus, Palette, Tags, FolderKanban } from "lucide-react";

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

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="roles" className="flex items-center gap-2 whitespace-nowrap">
              <Shield className="h-4 w-4" />
              Выдача прав
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2 whitespace-nowrap">
              <UserPlus className="h-4 w-4" />
              Приглашения
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2 whitespace-nowrap">
              <Tags className="h-4 w-4" />
              Категории
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 whitespace-nowrap">
              <FolderKanban className="h-4 w-4" />
              Проекты
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-2 whitespace-nowrap">
              <Palette className="h-4 w-4" />
              Иконки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-6">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <InvitationsManagement />
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdministrationPage;
