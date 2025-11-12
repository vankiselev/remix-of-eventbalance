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
import { Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

interface ItemQRCodeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    sku: string;
    name: string;
  };
}

export const ItemQRCode = ({ open, onOpenChange, item }: ItemQRCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (open && canvasRef.current) {
      generateQRCode();
    }
  }, [open, item]);

  const generateQRCode = async () => {
    if (!canvasRef.current) return;

    try {
      // Данные для QR-кода: JSON с информацией о товаре
      const qrData = JSON.stringify({
        id: item.id,
        sku: item.sku,
        name: item.name,
        type: "warehouse_item",
      });

      // Генерируем QR-код на canvas
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 300,
        margin: 2,
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Не удалось открыть окно печати");
      return;
    }

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
              margin-bottom: 4px;
            }
            .print-date {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
            <div class="item-info">
              <div class="item-sku">${item.sku}</div>
              <div class="item-name">${item.name}</div>
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
            <canvas ref={canvasRef} />
          </div>

          {/* Информация о товаре */}
          <div className="w-full text-center space-y-1 py-3 border-t">
            <p className="text-sm font-medium text-muted-foreground">Артикул</p>
            <p className="text-lg font-bold">{item.sku}</p>
            <p className="text-sm text-muted-foreground">{item.name}</p>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!qrDataUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handlePrint}
              disabled={!qrDataUrl}
            >
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            QR-код содержит ID товара, артикул и название
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
