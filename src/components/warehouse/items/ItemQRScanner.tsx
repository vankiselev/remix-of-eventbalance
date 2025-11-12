import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ItemQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (itemId: string) => void;
}

export const ItemQRScanner = ({
  open,
  onOpenChange,
  onScan,
}: ItemQRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true); // Показываем элемент ДО инициализации
      
      // Проверка поддержки камеры браузером
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Ваш браузер не поддерживает доступ к камере");
        setIsScanning(false);
        return;
      }

      // Небольшая задержка, чтобы DOM успел обновиться
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const onScanSuccess = (decodedText: string) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.id) {
            onScan(data.id);
            stopScanning();
            onOpenChange(false);
          }
        } catch (e) {
          setError("Неверный формат QR-кода товара");
        }
      };

      const onScanError = (errorMessage: string) => {
        console.debug("QR scan error:", errorMessage);
      };

      // Попытка запустить заднюю камеру, fallback на переднюю
      try {
        await scanner.start(
          { facingMode: { exact: "environment" } },
          config,
          onScanSuccess,
          onScanError
        );
      } catch (err) {
        await scanner.start(
          { facingMode: "user" },
          config,
          onScanSuccess,
          onScanError
        );
      }
    } catch (err: any) {
      setIsScanning(false);
      console.error("Error starting scanner:", err);
      
      let errorMessage = "Не удалось получить доступ к камере";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "Доступ к камере запрещён. Разрешите доступ в настройках Safari: Настройки → Safari → Камера → Разрешить";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "Камера не найдена на устройстве";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage = "Камера занята другим приложением. Закройте другие приложения, использующие камеру.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Камера не поддерживает требуемые настройки";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Сканировать QR-код товара
          </DialogTitle>
          <DialogDescription>
            Наведите камеру на QR-код для быстрого поиска товара
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isScanning && !error && (
            <Alert>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Нажмите "Запустить камеру"</li>
                  <li>Разрешите доступ к камере в браузере</li>
                  <li>Наведите на QR-код товара</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isScanning && (
            <Button onClick={startScanning} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Запустить камеру
            </Button>
          )}

          {isScanning && (
            <div
              id="qr-reader"
              className="w-full min-h-[300px] rounded-lg overflow-hidden border border-border"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
