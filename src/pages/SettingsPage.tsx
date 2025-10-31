import Layout from "@/components/Layout";
import { NotificationSettings } from "@/components/NotificationSettings";
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
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="notifications">Уведомления</TabsTrigger>
              </TabsList>
              <TabsContent value="notifications" className="space-y-4 mt-6">
                <NotificationSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
