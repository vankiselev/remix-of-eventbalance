import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";

interface ItemQRCodeBatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: WarehouseItemWithStock[];
}

export const ItemQRCodeBatch = ({
  open,
  onOpenChange,
  items,
}: ItemQRCodeBatchProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ item: WarehouseItemWithStock; dataUrl: string }[]>([]);

  useEffect(() => {
    if (open && items.length > 0) {
      generateAllQRCodes();
    }
  }, [open, items]);

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    try {
      const codes = await Promise.all(
        items.map(async (item) => {
          const qrData = JSON.stringify({
            id: item.id,
            sku: item.sku,
            name: item.name,
          });

          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 1,
            errorCorrectionLevel: "M",
          });

          return { item, dataUrl };
        })
      );
      setQrCodes(codes);
    } catch (error) {
      console.error("Error generating QR codes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-коды товаров</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10mm;
              padding: 5mm;
            }
            .qr-item {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 8mm;
              text-align: center;
              page-break-inside: avoid;
              background: white;
            }
            .qr-item img {
              width: 100%;
              max-width: 50mm;
              height: auto;
              margin: 0 auto 4mm;
              display: block;
            }
            .qr-item h3 {
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 2mm;
              color: #111827;
              line-height: 1.3;
            }
            .qr-item p {
              font-size: 11px;
              color: #6b7280;
              margin: 0;
            }
            @media print {
              .qr-grid {
                gap: 8mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
            ${qrCodes
              .map(
                ({ item, dataUrl }) => `
              <div class="qr-item">
                <img src="${dataUrl}" alt="QR Code" />
                <h3>${item.name}</h3>
                <p>SKU: ${item.sku}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownloadPDF = () => {
    // Create a temporary container with all QR codes
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // A4 size at 300 DPI
    const a4Width = 2480;
    const a4Height = 3508;
    canvas.width = a4Width;
    canvas.height = a4Height;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid: 3 columns, multiple rows
    const cols = 3;
    const qrSize = 400;
    const padding = 100;
    const gapX = (a4Width - cols * qrSize - 2 * padding) / (cols - 1);
    const gapY = 100;

    let currentX = padding;
    let currentY = padding;
    let col = 0;

    qrCodes.forEach(({ item, dataUrl }, index) => {
      const img = new Image();
      img.src = dataUrl;

      // Draw QR code
      ctx.drawImage(img, currentX, currentY, qrSize, qrSize);

      // Draw text
      ctx.fillStyle = "#111827";
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.fillText(item.name, currentX + qrSize / 2, currentY + qrSize + 50, qrSize);

      ctx.fillStyle = "#6b7280";
      ctx.font = "28px Arial";
      ctx.fillText(`SKU: ${item.sku}`, currentX + qrSize / 2, currentY + qrSize + 90, qrSize);

      // Move to next position
      col++;
      if (col >= cols) {
        col = 0;
        currentX = padding;
        currentY += qrSize + gapY + 100; // Extra space for text
      } else {
        currentX += qrSize + gapX;
      }
    });

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-codes-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовая печать QR-кодов</DialogTitle>
          <DialogDescription>
            QR-коды для {items.length} товаров
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Генерация QR-кодов...
            </span>
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              className="grid grid-cols-3 gap-4 py-4"
            >
              {qrCodes.map(({ item, dataUrl }) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 text-center space-y-2"
                >
                  <img
                    src={dataUrl}
                    alt={`QR Code for ${item.name}`}
                    className="w-full max-w-[150px] mx-auto"
                  />
                  <h4 className="font-semibold text-sm line-clamp-2">
                    {item.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Печать
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
