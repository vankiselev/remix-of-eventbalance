import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, Users, MapPin, Briefcase } from "lucide-react";
import ContractorsTab from "./contacts/ContractorsTab";
import AnimatorsTab from "./contacts/AnimatorsTab";
import ClientsTab from "./contacts/ClientsTab";
import VenuesTab from "./contacts/VenuesTab";

const Contacts = () => {
  const [activeTab, setActiveTab] = useState("contractors");

  return (
    <div className="p-6 space-y-6 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">Контакты</h1>
          <p className="text-muted-foreground truncate">
            Управление контактами подрядчиков, аниматоров, клиентов и площадок
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Подрядчики</span>
            <span className="sm:hidden">Подр.</span>
          </TabsTrigger>
          <TabsTrigger value="animators" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Аниматоры</span>
            <span className="sm:hidden">Аним.</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Клиенты</span>
            <span className="sm:hidden">Клиент.</span>
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Площадки</span>
            <span className="sm:hidden">Площ.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4">
          <ContractorsTab />
        </TabsContent>

        <TabsContent value="animators" className="space-y-4">
          <AnimatorsTab />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientsTab />
        </TabsContent>

        <TabsContent value="venues" className="space-y-4">
          <VenuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contacts;