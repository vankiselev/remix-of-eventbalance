import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesManagement } from "@/components/roles/RolesManagement";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import { CategoryIconsManagement } from "@/components/admin/CategoryIconsManagement";
import Layout from "@/components/Layout";
import { Shield, UserPlus, Palette } from "lucide-react";

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
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Выдача прав
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Приглашения
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-2">
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

          <TabsContent value="icons" className="mt-6">
            <CategoryIconsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdministrationPage;
