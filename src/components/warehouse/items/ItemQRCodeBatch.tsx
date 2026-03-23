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
import { escapeHtml } from "@/utils/escapeHtml";
import QRCode from "qrcode";
import { WarehouseItemWithStock } from "@/hooks/useWarehouseItems";
import { supabase } from "@/integrations/supabase/client";

interface ItemQRCodeBatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: WarehouseItemWithStock[];
}

interface LocationStock {
  location_name: string;
  quantity: number;
  floor: string | null;
  rack: string | null;
  shelf: string | null;
  cell: string | null;
}

interface ItemWithLocations {
  item: WarehouseItemWithStock;
  dataUrl: string;
  locations: LocationStock[];
}

export const ItemQRCodeBatch = ({
  open,
  onOpenChange,
  items,
}: ItemQRCodeBatchProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<ItemWithLocations[]>([]);

  useEffect(() => {
    if (open && items.length > 0) {
      generateAllQRCodes();
    }
  }, [open, items]);

  const loadItemLocations = async (itemId: string): Promise<LocationStock[]> => {
    try {
      const { data, error } = await supabase
        .from('warehouse_stock' as any)
        .select(`
          quantity,
          warehouse_locations!inner(
            name,
            floor,
            rack,
            shelf,
            cell
          )
        `)
        .eq('item_id', itemId)
        .gt('quantity', 0);

      if (error) throw error;

      return (data || []).map((stock: any) => ({
        location_name: stock.warehouse_locations.name,
        quantity: stock.quantity,
        floor: stock.warehouse_locations.floor,
        rack: stock.warehouse_locations.rack,
        shelf: stock.warehouse_locations.shelf,
        cell: stock.warehouse_locations.cell,
      }));
    } catch (error) {
      console.error('Error loading locations for item:', itemId, error);
      return [];
    }
  };

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    try {
      const codes = await Promise.all(
        items.map(async (item) => {
          const locations = await loadItemLocations(item.id);
          
          const qrData = JSON.stringify({
            id: item.id,
            sku: item.sku,
            name: item.name,
            type: "warehouse_item",
            locations: locations.map(loc => ({
              location_name: loc.location_name,
              quantity: loc.quantity,
              placement: [loc.floor, loc.rack, loc.shelf, loc.cell]
                .filter(Boolean)
                .join(' / ') || null
            }))
          });

          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 1,
            errorCorrectionLevel: "M",
          });

          return { item, dataUrl, locations };
        })
      );
      setQrCodes(codes);
    } catch (error) {
      console.error("Error generating QR codes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatLocation = (loc: LocationStock) => {
    const placement = [
      loc.floor && `Эт.${loc.floor}`,
      loc.rack && `Ст.${loc.rack}`,
      loc.shelf && `П.${loc.shelf}`,
      loc.cell && `Яч.${loc.cell}`
    ].filter(Boolean);
    
    return placement.length > 0 
      ? `${loc.location_name} (${placement.join(', ')})`
      : loc.location_name;
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
              font-size: 13px;
              font-weight: 600;
              margin: 0 0 2mm;
              color: #111827;
              line-height: 1.3;
            }
            .qr-item .sku {
              font-size: 11px;
              color: #6b7280;
              margin: 0 0 3mm;
              font-weight: 500;
            }
            .qr-item .locations {
              font-size: 9px;
              color: #9ca3af;
              margin: 2mm 0 0;
              text-align: left;
              border-top: 1px solid #e5e7eb;
              padding-top: 2mm;
            }
            .qr-item .location-line {
              margin: 1mm 0;
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
                ({ item, dataUrl, locations }) => `
              <div class="qr-item">
                <img src="${dataUrl}" alt="QR Code" />
                <h3>${escapeHtml(item.name)}</h3>
                <div class="sku">SKU: ${escapeHtml(item.sku)}</div>
                ${locations.length > 0 ? `
                  <div class="locations">
                    ${locations.slice(0, 2).map(loc => `
                      <div class="location-line">
                        ${formatLocation(loc)} • ${loc.quantity} шт
                      </div>
                    `).join('')}
                    ${locations.length > 2 ? `<div class="location-line">+${locations.length - 2} ещё</div>` : ''}
                  </div>
                ` : ''}
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

    qrCodes.forEach(({ item, dataUrl, locations }, index) => {
      const img = new Image();
      img.src = dataUrl;

      // Draw QR code
      ctx.drawImage(img, currentX, currentY, qrSize, qrSize);

      // Draw text
      ctx.fillStyle = "#111827";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      
      // Item name (with word wrap)
      const maxWidth = qrSize;
      const words = item.name.split(' ');
      let line = '';
      let textY = currentY + qrSize + 45;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, currentX + qrSize / 2, textY);
          line = words[i] + ' ';
          textY += 35;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, currentX + qrSize / 2, textY);

      // SKU
      ctx.fillStyle = "#6b7280";
      ctx.font = "24px Arial";
      ctx.fillText(`SKU: ${item.sku}`, currentX + qrSize / 2, textY + 35);

      // Locations (first 2)
      if (locations.length > 0) {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "20px Arial";
        let locY = textY + 65;
        locations.slice(0, 2).forEach(loc => {
          const locText = `${formatLocation(loc)} • ${loc.quantity} шт`;
          ctx.fillText(locText, currentX + qrSize / 2, locY, qrSize);
          locY += 25;
        });
        if (locations.length > 2) {
          ctx.fillText(`+${locations.length - 2} ещё`, currentX + qrSize / 2, locY, qrSize);
        }
      }

      // Move to next position
      col++;
      if (col >= cols) {
        col = 0;
        currentX = padding;
        currentY += qrSize + gapY + 180; // Extra space for text and locations
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
            QR-коды для {items.length} товаров с информацией о размещении
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Генерация QR-кодов с локациями...
            </span>
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              className="grid grid-cols-3 gap-4 py-4"
            >
              {qrCodes.map(({ item, dataUrl, locations }) => (
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
                  {locations.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                      {locations.slice(0, 2).map((loc, idx) => (
                        <div key={idx}>
                          {formatLocation(loc)} • {loc.quantity} шт
                        </div>
                      ))}
                      {locations.length > 2 && (
                        <div className="font-medium">+{locations.length - 2} ещё</div>
                      )}
                    </div>
                  )}
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
