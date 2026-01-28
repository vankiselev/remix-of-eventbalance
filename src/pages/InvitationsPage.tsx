import Layout from "@/components/Layout";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import { PendingUsersManagement } from "@/components/admin/PendingUsersManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail } from "lucide-react";

const InvitationsPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Управление приглашениями</h1>
        
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Ожидающие регистрации
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Приглашения по email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            <PendingUsersManagement />
          </TabsContent>
          
          <TabsContent value="invitations" className="mt-6">
            <InvitationsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default InvitationsPage;
