import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemQRCodeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    sku: string;
    name: string;
  };
}

interface LocationStock {
  location_id: string;
  location_name: string;
  quantity: number;
  floor: string | null;
  rack: string | null;
  shelf: string | null;
  cell: string | null;
}

export const ItemQRCode = ({ open, onOpenChange, item }: ItemQRCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [locations, setLocations] = useState<LocationStock[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    if (open) {
      loadLocationData();
    }
  }, [open, item.id]);

  useEffect(() => {
    if (open && canvasRef.current && locations.length >= 0) {
      generateQRCode();
    }
  }, [open, item, locations]);

  const loadLocationData = async () => {
    setIsLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_stock' as any)
        .select(`
          quantity,
          location_id,
          warehouse_locations!inner(
            id,
            name,
            floor,
            rack,
            shelf,
            cell
          )
        `)
        .eq('item_id', item.id)
        .gt('quantity', 0);

      if (error) throw error;

      const locationData = (data || []).map((stock: any) => ({
        location_id: stock.warehouse_locations.id,
        location_name: stock.warehouse_locations.name,
        quantity: stock.quantity,
        floor: stock.warehouse_locations.floor,
        rack: stock.warehouse_locations.rack,
        shelf: stock.warehouse_locations.shelf,
        cell: stock.warehouse_locations.cell,
      }));

      setLocations(locationData);
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const generateQRCode = async () => {
    if (!canvasRef.current) return;

    try {
      // Расширенные данные для QR-кода с локациями
      const qrData = JSON.stringify({
        id: item.id,
        sku: item.sku,
        name: item.name,
        type: "warehouse_item",
        locations: locations.map(loc => ({
          location_id: loc.location_id,
          location_name: loc.location_name,
          quantity: loc.quantity,
          placement: [loc.floor, loc.rack, loc.shelf, loc.cell]
            .filter(Boolean)
            .join(' / ') || null
        }))
      });

      // Генерируем QR-код на canvas
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Сохраняем data URL для скачивания
      const dataUrl = canvasRef.current.toDataURL("image/png");
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Ошибка при генерации QR-кода");
    }
  };

  const formatLocation = (loc: LocationStock) => {
    const parts = [loc.location_name];
    const placement = [
      loc.floor && `Этаж ${loc.floor}`,
      loc.rack && `Стеллаж ${loc.rack}`,
      loc.shelf && `Полка ${loc.shelf}`,
      loc.cell && `Ячейка ${loc.cell}`
    ].filter(Boolean);
    
    if (placement.length > 0) {
      parts.push(placement.join(', '));
    }
    
    return parts.join(' • ');
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Не удалось открыть окно печати");
      return;
    }

    const locationsHtml = locations.length > 0 
      ? locations.map(loc => `
          <div style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 4px;">
            <div style="font-weight: 600; color: #111827;">${loc.location_name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              ${formatLocation(loc)} • ${loc.quantity} шт
            </div>
          </div>
        `).join('')
      : '<div style="color: #9ca3af; font-size: 13px;">Нет информации о размещении</div>';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-код: ${item.sku}</title>
          <style>
            @media print {
              @page {
                size: auto;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 30px;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            .qr-code {
              display: block;
              margin: 0 auto 20px;
              max-width: 300px;
              height: auto;
            }
            .item-info {
              margin-top: 20px;
            }
            .item-sku {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #111827;
            }
            .item-name {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 16px;
            }
            .locations-section {
              text-align: left;
              margin-top: 20px;
              border-top: 1px solid #e5e7eb;
              padding-top: 16px;
            }
            .locations-title {
              font-size: 13px;
              font-weight: 600;
              color: #6b7280;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .print-date {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
            <div class="item-info">
              <div class="item-sku">${item.sku}</div>
              <div class="item-name">${item.name}</div>
              
              <div class="locations-section">
                <div class="locations-title">Размещение товара</div>
                ${locationsHtml}
              </div>
              
              <div class="print-date">Дата печати: ${new Date().toLocaleDateString('ru-RU')}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `qr-${item.sku}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success("QR-код сохранен");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR-код товара
          </DialogTitle>
          <DialogDescription>
            Сканируйте QR-код для быстрого доступа к информации о товаре
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* Canvas для генерации QR-кода */}
          <div className="p-4 bg-white rounded-lg border-2 border-border">
            {isLoadingLocations ? (
              <Skeleton className="w-[300px] h-[300px]" />
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>

          {/* Информация о товаре */}
          <div className="w-full text-center space-y-1 py-3 border-t">
            <p className="text-sm font-medium text-muted-foreground">Артикул</p>
            <p className="text-lg font-bold">{item.sku}</p>
            <p className="text-sm text-muted-foreground">{item.name}</p>
          </div>

          {/* Локации */}
          {isLoadingLocations ? (
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : locations.length > 0 && (
            <div className="w-full text-left space-y-2 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <MapPin className="h-3 w-3" />
                Размещение
              </div>
              {locations.map((loc) => (
                <div key={loc.location_id} className="text-sm">
                  <div className="font-medium">{loc.location_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatLocation(loc)} • {loc.quantity} шт
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!qrDataUrl || isLoadingLocations}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handlePrint}
              disabled={!qrDataUrl || isLoadingLocations}
            >
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            QR-код содержит ID, артикул, название и все локации товара
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
