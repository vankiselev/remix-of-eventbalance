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
        <TabsList className="w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="contractors" className="flex items-center gap-2 whitespace-nowrap">
            <Briefcase className="h-4 w-4" />
            Подрядчики
          </TabsTrigger>
          <TabsTrigger value="animators" className="flex items-center gap-2 whitespace-nowrap">
            <Users className="h-4 w-4" />
            Аниматоры
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2 whitespace-nowrap">
            <Building2 className="h-4 w-4" />
            Клиенты
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center gap-2 whitespace-nowrap">
            <MapPin className="h-4 w-4" />
            Площадки
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