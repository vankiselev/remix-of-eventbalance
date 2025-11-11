import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useWarehouseSettings, WarehouseSettings } from "@/hooks/useWarehouseSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Bell, Image, DollarSign, RotateCcw } from "lucide-react";

export const WarehouseSettingsManagement = () => {
  const { settings: rawSettings, isLoading, updateSettings } = useWarehouseSettings();
  const settings = rawSettings as unknown as WarehouseSettings | undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Настройки склада</CardTitle>
          <CardDescription>Настройки не найдены</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Основные настройки */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <div>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>
                Общие параметры работы модуля склада
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="module_enabled">Модуль склада активен</Label>
              <p className="text-sm text-muted-foreground">
                Включить или отключить весь модуль складского учёта
              </p>
            </div>
            <Switch
              id="module_enabled"
              checked={settings.module_enabled}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ module_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_unit">Единица измерения по умолчанию</Label>
            <Input
              id="default_unit"
              value={settings.default_unit}
              onChange={(e) =>
                updateSettings.mutate({ default_unit: e.target.value })
              }
              placeholder="шт, кг, м, л"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_currency">Валюта по умолчанию</Label>
            <Input
              id="default_currency"
              value={settings.default_currency}
              onChange={(e) =>
                updateSettings.mutate({ default_currency: e.target.value })
              }
              placeholder="₽, $, €"
            />
          </div>
        </CardContent>
      </Card>

      {/* Автоматизация */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            <div>
              <CardTitle>Автоматизация</CardTitle>
              <CardDescription>
                Автоматическое создание задач и уведомлений
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_create_return_tasks">
                Автосоздание задач возврата
              </Label>
              <p className="text-sm text-muted-foreground">
                Автоматически создавать задачи на возврат реквизита после мероприятий
              </p>
            </div>
            <Switch
              id="auto_create_return_tasks"
              checked={settings.auto_create_return_tasks}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ auto_create_return_tasks: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="return_task_delay_days">
              Задержка создания задачи возврата (дней)
            </Label>
            <Input
              id="return_task_delay_days"
              type="number"
              min="0"
              max="7"
              value={settings.return_task_delay_days}
              onChange={(e) =>
                updateSettings.mutate({
                  return_task_delay_days: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Через сколько дней после мероприятия создавать задачу возврата
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Уведомления */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>
                Настройка оповещений о состоянии склада
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low_stock_notifications">
                Уведомления о низких остатках
              </Label>
              <p className="text-sm text-muted-foreground">
                Отправлять уведомления когда товар заканчивается
              </p>
            </div>
            <Switch
              id="low_stock_notifications"
              checked={settings.low_stock_notifications}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ low_stock_notifications: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="low_stock_threshold_percent">
              Порог низкого остатка (%)
            </Label>
            <Input
              id="low_stock_threshold_percent"
              type="number"
              min="0"
              max="100"
              value={settings.low_stock_threshold_percent}
              onChange={(e) =>
                updateSettings.mutate({
                  low_stock_threshold_percent: parseInt(e.target.value) || 20,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Уведомление отправляется когда остаток меньше этого процента от
              минимального
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Требования к фото */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            <div>
              <CardTitle>Фотографии</CardTitle>
              <CardDescription>
                Требования к загрузке фотографий при операциях
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_photo_on_writeoff">
                Обязательное фото при списании
              </Label>
              <p className="text-sm text-muted-foreground">
                Нельзя списать товар без фотографии
              </p>
            </div>
            <Switch
              id="require_photo_on_writeoff"
              checked={settings.require_photo_on_writeoff}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ require_photo_on_writeoff: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_photo_on_receipt">
                Обязательное фото при приходе
              </Label>
              <p className="text-sm text-muted-foreground">
                Требовать фотографию при приёмке товара
              </p>
            </div>
            <Switch
              id="require_photo_on_receipt"
              checked={settings.require_photo_on_receipt}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ require_photo_on_receipt: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Интеграция с финансами */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <div>
              <CardTitle>Интеграция с финансами</CardTitle>
              <CardDescription>
                Автоматическое создание транзакций при движениях
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="finance_integration_enabled">
                Интеграция включена
              </Label>
              <p className="text-sm text-muted-foreground">
                Автоматически создавать финансовые транзакции при приходе и
                списании товаров
              </p>
            </div>
            <Switch
              id="finance_integration_enabled"
              checked={settings.finance_integration_enabled}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ finance_integration_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
