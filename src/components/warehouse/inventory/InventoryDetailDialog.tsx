import { useState } from "react";
import { useWarehouseInventories, useInventoryItems } from "@/hooks/useWarehouseInventories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, CheckCircle, XCircle, ScanLine, Save } from "lucide-react";
import { InventoryScanMode } from "./InventoryScanMode";
import { InventoryItemsTable } from "./InventoryItemsTable";
import { InventoryApplyDialog } from "./InventoryApplyDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface InventoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string;
}

const STATUS_CONFIG = {
  draft: { label: "Черновик", variant: "outline" as const },
  in_progress: { label: "В процессе", variant: "default" as const },
  completed: { label: "Завершена", variant: "secondary" as const },
  cancelled: { label: "Отменена", variant: "destructive" as const },
};

export const InventoryDetailDialog = ({
  open,
  onOpenChange,
  inventoryId,
}: InventoryDetailDialogProps) => {
  const { inventories, updateInventory } = useWarehouseInventories();
  const { items, isLoading } = useInventoryItems(inventoryId);
  const [isScanMode, setIsScanMode] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

  const inventory = inventories.find((inv) => inv.id === inventoryId);

  if (!inventory) return null;

  const statusConfig = STATUS_CONFIG[inventory.status];
  const scannedCount = items.filter(item => item.actual_quantity !== null).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (scannedCount / totalCount) * 100 : 0;

  const discrepancyCount = items.filter(
    item => item.actual_quantity !== null && item.difference !== 0
  ).length;

  const handleStart = async () => {
    await updateInventory.mutateAsync({
      id: inventoryId,
      updates: {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
    });
  };

  const handleCancel = async () => {
    if (confirm("Вы уверены, что хотите отменить инвентаризацию?")) {
      await updateInventory.mutateAsync({
        id: inventoryId,
        updates: {
          status: 'cancelled',
        },
      });
    }
  };

  const handleComplete = () => {
    if (scannedCount < totalCount) {
      if (!confirm(`Не все позиции отсканированы (${scannedCount}/${totalCount}). Продолжить?`)) {
        return;
      }
    }
    setIsApplyDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{inventory.name}</DialogTitle>
                <DialogDescription>
                  {inventory.notes || "Проведение инвентаризации"}
                </DialogDescription>
              </div>
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-[400px]" />
            </div>
          ) : (
            <>
              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Прогресс</p>
                  <p className="text-2xl font-bold">
                    {scannedCount} / {totalCount}
                  </p>
                  <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Расхождения</p>
                  <p className="text-2xl font-bold text-destructive">
                    {discrepancyCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <p className="text-sm font-medium">
                    {inventory.started_at && `Начато: ${format(new Date(inventory.started_at), "dd.MM.yyyy HH:mm")}`}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {inventory.status === 'draft' && (
                  <Button onClick={handleStart}>
                    <Play className="h-4 w-4 mr-2" />
                    Начать
                  </Button>
                )}

                {inventory.status === 'in_progress' && (
                  <>
                    <Button
                      variant={isScanMode ? "secondary" : "default"}
                      onClick={() => setIsScanMode(!isScanMode)}
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      {isScanMode ? "Выйти из режима сканирования" : "Режим сканирования"}
                    </Button>
                    <Button onClick={handleComplete}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Завершить
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Отменить
                    </Button>
                  </>
                )}
              </div>

              {/* Content */}
              {isScanMode ? (
                <InventoryScanMode
                  inventoryId={inventoryId}
                  items={items}
                  onExit={() => setIsScanMode(false)}
                />
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">
                      Все ({totalCount})
                    </TabsTrigger>
                    <TabsTrigger value="scanned">
                      Отсканированные ({scannedCount})
                    </TabsTrigger>
                    <TabsTrigger value="discrepancies">
                      Расхождения ({discrepancyCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <InventoryItemsTable items={items} />
                  </TabsContent>

                  <TabsContent value="scanned">
                    <InventoryItemsTable
                      items={items.filter(item => item.actual_quantity !== null)}
                    />
                  </TabsContent>

                  <TabsContent value="discrepancies">
                    <InventoryItemsTable
                      items={items.filter(
                        item => item.actual_quantity !== null && item.difference !== 0
                      )}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {isApplyDialogOpen && (
        <InventoryApplyDialog
          open={isApplyDialogOpen}
          onOpenChange={setIsApplyDialogOpen}
          inventoryId={inventoryId}
          items={items}
          onComplete={() => {
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
};
