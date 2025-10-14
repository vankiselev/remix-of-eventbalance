import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const RolesManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление ролями</h2>
          <p className="text-muted-foreground">
            Создавайте и настраивайте роли с различными правами доступа
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Создать роль
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Функционал в разработке</CardTitle>
          <CardDescription>
            Здесь будет реализовано управление ролями и правами доступа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            В этом разделе вы сможете:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Просматривать все роли в системе</li>
            <li>Создавать новые роли</li>
            <li>Настраивать права доступа для каждой роли</li>
            <li>Клонировать существующие роли</li>
            <li>Просматривать историю изменений прав</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
