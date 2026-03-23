import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { Activity, TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface Movement {
  id: string;
  operation_type: string;
  quantity: number;
  operation_date: string;
  notes: string | null;
  warehouse_items: { name: string } | null;
  from_location?: { name: string } | null;
  to_location?: { name: string } | null;
}

interface MovementHistoryProps {
  movements: any[];
}

export const MovementHistory = ({ movements }: MovementHistoryProps) => {
  const [period, setPeriod] = useState<string>("7days");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const dateRange = getDateRange();
  const filteredMovements = movements.filter(m =>
    isWithinInterval(new Date(m.operation_date), dateRange)
  ).sort((a, b) => 
    new Date(b.operation_date).getTime() - new Date(a.operation_date).getTime()
  );

  // Calculate stats
  const stats = {
    receipt: filteredMovements.filter(m => m.operation_type === 'receipt').length,
    issue: filteredMovements.filter(m => m.operation_type === 'issue').length,
    return: filteredMovements.filter(m => m.operation_type === 'return').length,
    writeOff: filteredMovements.filter(m => m.operation_type === 'write_off').length,
    transfer: filteredMovements.filter(m => m.operation_type === 'transfer').length,
    inventory: filteredMovements.filter(m => m.operation_type === 'inventory').length,
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'issue':
      case 'write_off':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getOperationText = (type: string) => {
    const types: Record<string, string> = {
      receipt: 'Приход',
      issue: 'Выдача',
      return: 'Возврат',
      write_off: 'Списание',
      transfer: 'Перемещение',
      inventory: 'Инвентаризация',
    };
    return types[type] || type;
  };

  const getOperationColor = (type: string) => {
    const colors: Record<string, string> = {
      receipt: 'bg-green-500/10 text-green-700 dark:text-green-400',
      issue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      return: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      write_off: 'bg-red-500/10 text-red-700 dark:text-red-400',
      transfer: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      inventory: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Приход</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.receipt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Выдача</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.issue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Возврат</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{stats.return}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Списание</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.writeOff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Перемещение</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{stats.transfer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Инвентаризация</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.inventory}</p>
          </CardContent>
        </Card>
      </div>

      {/* Movement List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                История движений
              </CardTitle>
              <CardDescription>
                {filteredMovements.length} операций за выбранный период
              </CardDescription>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Последние 7 дней</SelectItem>
                <SelectItem value="30days">Последние 30 дней</SelectItem>
                <SelectItem value="thisMonth">Текущий месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Нет движений за выбранный период
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getOperationIcon(movement.operation_type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {movement.warehouse_items?.name || 'Товар не найден'}
                        </p>
                        <Badge className={getOperationColor(movement.operation_type)}>
                          {getOperationText(movement.operation_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(movement.operation_date), 'd MMMM, HH:mm', { locale: ru })}
                          </span>
                        </div>
                        {movement.from_location && (
                          <span>Откуда: {movement.from_location.name}</span>
                        )}
                        {movement.to_location && (
                          <span>Куда: {movement.to_location.name}</span>
                        )}
                      </div>
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground">{movement.notes}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-bold whitespace-nowrap ml-4">
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity} шт
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
