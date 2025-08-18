import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Финансовый помощник</h1>
            <p className="text-muted-foreground">Система управления финансами для ивент сферы</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Добро пожаловать, {user?.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Выйти
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>События</CardTitle>
              <CardDescription>Управление мероприятиями и их бюджетами</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Управлять событиями</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Финансы</CardTitle>
              <CardDescription>Доходы, расходы и аналитика</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Финансовая отчетность</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сотрудники</CardTitle>
              <CardDescription>Управление персоналом и зарплатами</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Управлять персоналом</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Быстрая статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Активных событий</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">₽0</div>
                  <div className="text-sm text-muted-foreground">Общий бюджет</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">₽0</div>
                  <div className="text-sm text-muted-foreground">Доходы</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">₽0</div>
                  <div className="text-sm text-muted-foreground">Расходы</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
