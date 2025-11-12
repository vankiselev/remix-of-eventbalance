import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, AlertCircle, Check, Minus, Plus } from "lucide-react";
import { useInventoryItems, InventoryItemWithDetails } from "@/hooks/useWarehouseInventories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InventoryScanModeProps {
  inventoryId: string;
  items: InventoryItemWithDetails[];
  onExit: () => void;
}

export const InventoryScanMode = ({
  inventoryId,
  items,
  onExit,
}: InventoryScanModeProps) => {
  const { updateInventoryItem } = useInventoryItems(inventoryId);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<InventoryItemWithDetails | null>(null);
  const [quantity, setQuantity] = useState<string>("0");
  const [scannedItemId, setScannedItemId] = useState<string | null>(null);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode("qr-reader-inventory");

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.id) {
              handleItemScanned(data.id);
            }
          } catch (e) {
            setError("Неверный формат QR-кода");
          }
        },
        (errorMessage) => {
          console.debug("QR scan error:", errorMessage);
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError("Не удалось запустить камеру");
    }
  };

  const handleItemScanned = (itemId: string) => {
    const inventoryItem = items.find(item => item.item_id === itemId);
    
    if (!inventoryItem) {
      toast.error("Товар не найден в инвентаризации");
      return;
    }

    setScannedItemId(itemId);
    setCurrentItem(inventoryItem);
    setQuantity(inventoryItem.expected_quantity.toString());
    toast.success(`Отсканирован: ${inventoryItem.item_name}`);
  };

  const handleSaveQuantity = async () => {
    if (!currentItem) return;

    const actualQty = parseFloat(quantity);
    if (isNaN(actualQty) || actualQty < 0) {
      toast.error("Введите корректное количество");
      return;
    }

    await updateInventoryItem.mutateAsync({
      id: currentItem.id,
      updates: {
        actual_quantity: actualQty,
        scanned_at: new Date().toISOString(),
      },
    });

    toast.success("Количество сохранено");
    setCurrentItem(null);
    setQuantity("0");
    setScannedItemId(null);
  };

  const adjustQuantity = (delta: number) => {
    const current = parseFloat(quantity) || 0;
    const newValue = Math.max(0, current + delta);
    setQuantity(newValue.toString());
  };

  useEffect(() => {
    startScanning();

    return () => {
      const scanner = Html5Qrcode.getCameras().then(() => {
        const qrReader = document.getElementById("qr-reader-inventory");
        if (qrReader) {
          Html5Qrcode.getCameras();
        }
      });
    };
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Сканирование
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id="qr-reader-inventory"
              className="w-full rounded-lg overflow-hidden border"
            />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Наведите камеру на QR-код товара
            </p>
          </CardContent>
        </Card>

        {/* Current Item */}
        <Card>
          <CardHeader>
            <CardTitle>Текущий товар</CardTitle>
          </CardHeader>
          <CardContent>
            {currentItem ? (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{currentItem.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {currentItem.item_sku}
                  </p>
                  {currentItem.location_name && (
                    <p className="text-sm text-muted-foreground">
                      Локация: {currentItem.location_name}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Ожидаемое количество
                  </p>
                  <p className="text-2xl font-bold">
                    {currentItem.expected_quantity} {currentItem.item_unit}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Фактическое количество
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => adjustQuantity(-1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="text-center text-xl font-bold"
                      min="0"
                      step="1"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => adjustQuantity(1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {parseFloat(quantity) !== currentItem.expected_quantity && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Расхождение:{" "}
                      <strong>
                        {parseFloat(quantity) - currentItem.expected_quantity > 0 ? "+" : ""}
                        {(parseFloat(quantity) - currentItem.expected_quantity).toFixed(2)} {currentItem.item_unit}
                      </strong>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSaveQuantity}
                  disabled={updateInventoryItem.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Сохранить
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Отсканируйте QR-код товара</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onExit}>
          <X className="h-4 w-4 mr-2" />
          Выйти из режима сканирования
        </Button>
      </div>
    </div>
  );
};
