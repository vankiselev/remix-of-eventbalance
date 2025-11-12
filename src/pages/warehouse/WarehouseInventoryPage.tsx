import { useState } from "react";
import { useWarehouseInventories } from "@/hooks/useWarehouseInventories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ClipboardList, Play, CheckCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryCreateDialog } from "@/components/warehouse/inventory/InventoryCreateDialog";
import { InventoryDetailDialog } from "@/components/warehouse/inventory/InventoryDetailDialog";
import { format } from "date-fns";

const STATUS_CONFIG = {
  draft: { label: "Черновик", variant: "outline" as const, icon: ClipboardList },
  in_progress: { label: "В процессе", variant: "default" as const, icon: Play },
  completed: { label: "Завершена", variant: "secondary" as const, icon: CheckCircle },
  cancelled: { label: "Отменена", variant: "destructive" as const, icon: XCircle },
};

export const WarehouseInventoryPage = () => {
  const { inventories, isLoading } = useWarehouseInventories();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Инвентаризация</h1>
          <p className="text-muted-foreground">
            Проведение инвентаризации и сверка остатков
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая инвентаризация
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История инвентаризаций</CardTitle>
          <CardDescription>
            Все проведенные и текущие инвентаризации
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventories.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Инвентаризации не проводились
              </h3>
              <p className="text-muted-foreground mb-4">
                Создайте первую инвентаризацию для проверки остатков
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать инвентаризацию
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>Завершение</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories.map((inventory) => {
                  const statusConfig = STATUS_CONFIG[inventory.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow
                      key={inventory.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedInventoryId(inventory.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{inventory.name}</p>
                          {inventory.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {inventory.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inventory.started_at
                          ? format(new Date(inventory.started_at), "dd.MM.yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {inventory.completed_at
                          ? format(new Date(inventory.completed_at), "dd.MM.yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInventoryId(inventory.id);
                          }}
                        >
                          Открыть
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InventoryCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {selectedInventoryId && (
        <InventoryDetailDialog
          open={!!selectedInventoryId}
          onOpenChange={(open) => !open && setSelectedInventoryId(null)}
          inventoryId={selectedInventoryId}
        />
      )}
    </div>
  );
};
