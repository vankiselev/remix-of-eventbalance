import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesManagement } from "@/components/roles/RolesManagement";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import Layout from "@/components/Layout";
import { Shield, UserPlus } from "lucide-react";

const AdministrationPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Администрирование</h1>
          <p className="text-muted-foreground">
            Управление системой, ролями и приглашениями
          </p>
        </div>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Выдача прав
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Приглашения
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-6">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <InvitationsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdministrationPage;
