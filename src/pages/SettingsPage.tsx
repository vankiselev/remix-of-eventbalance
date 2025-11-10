import Layout from "@/components/Layout";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SettingsPage = () => {
  return (
    <Layout>
      <div className="container max-w-4xl py-6">
        <Card>
          <CardHeader>
            <CardTitle>Настройки</CardTitle>
            <CardDescription>
              Управляйте настройками приложения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="notifications" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notifications">Уведомления</TabsTrigger>
                <TabsTrigger value="security">Безопасность</TabsTrigger>
              </TabsList>
              <TabsContent value="notifications" className="space-y-4 mt-6">
                <NotificationSettings />
              </TabsContent>
              <TabsContent value="security" className="space-y-4 mt-6">
                <PasswordChangeForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
