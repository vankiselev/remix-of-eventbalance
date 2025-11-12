import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { InventoryItemWithDetails } from "@/hooks/useWarehouseInventories";
import { useWarehouseInventories } from "@/hooks/useWarehouseInventories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string;
  items: InventoryItemWithDetails[];
  onComplete: () => void;
}

export const InventoryApplyDialog = ({
  open,
  onOpenChange,
  inventoryId,
  items,
  onComplete,
}: InventoryApplyDialogProps) => {
  const { updateInventory } = useWarehouseInventories();
  const [isApplying, setIsApplying] = useState(false);

  const discrepancies = items.filter(
    (item) => item.actual_quantity !== null && item.difference !== 0
  );

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Apply adjustments to warehouse_stock
      for (const item of discrepancies) {
        if (item.actual_quantity === null) continue;

        // Update or insert stock record
        const { error } = await supabase
          .from('warehouse_stock' as any)
          .upsert({
            item_id: item.item_id,
            location_id: item.location_id,
            quantity: item.actual_quantity,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'item_id,location_id'
          });

        if (error) throw error;

        // Create adjustment movement
        await supabase
          .from('warehouse_movements' as any)
          .insert({
            item_id: item.item_id,
            from_location_id: item.location_id,
            to_location_id: item.location_id,
            quantity: Math.abs(item.difference!),
            movement_type: item.difference! > 0 ? 'receipt' : 'writeoff',
            operation_date: new Date().toISOString(),
            notes: `Корректировка по инвентаризации. Расхождение: ${item.difference} ${item.item_unit}`,
          });
      }

      // Mark inventory as completed
      await updateInventory.mutateAsync({
        id: inventoryId,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });

      toast.success("Инвентаризация завершена и применена");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying inventory:", error);
      toast.error("Ошибка при применении инвентаризации");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCompleteWithoutApply = async () => {
    try {
      await updateInventory.mutateAsync({
        id: inventoryId,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });

      toast.success("Инвентаризация завершена без применения корректировок");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing inventory:", error);
      toast.error("Ошибка при завершении инвентаризации");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Завершение инвентаризации</DialogTitle>
          <DialogDescription>
            Проверьте результаты и примените корректировки
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Всего позиций
              </p>
              <p className="text-3xl font-bold">{items.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Расхождений
              </p>
              <p className="text-3xl font-bold text-destructive">
                {discrepancies.length}
              </p>
            </div>
          </div>

          {/* Discrepancies */}
          {discrepancies.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Обнаруженные расхождения:</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {discrepancies.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.location_name || "Без локации"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {item.expected_quantity} → {item.actual_quantity} {item.item_unit}
                      </p>
                      <p
                        className={`font-medium ${
                          item.difference! > 0
                            ? "text-green-600"
                            : "text-destructive"
                        }`}
                      >
                        {item.difference! > 0 ? "+" : ""}
                        {item.difference} {item.item_unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {discrepancies.length > 0 ? (
                <>
                  При применении корректировок будут автоматически созданы
                  движения на склад/со склада для исправления остатков.
                  Это действие нельзя отменить.
                </>
              ) : (
                <>
                  Расхождений не обнаружено. Инвентаризация будет завершена
                  без создания корректировок.
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              Отмена
            </Button>
            {discrepancies.length > 0 && (
              <Button
                variant="outline"
                onClick={handleCompleteWithoutApply}
                disabled={isApplying}
              >
                Завершить без корректировок
              </Button>
            )}
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              {discrepancies.length > 0
                ? "Применить корректировки"
                : "Завершить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
