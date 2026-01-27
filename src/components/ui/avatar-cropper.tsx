import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";
import { cropCircularImage, compressImage } from "@/utils/imageCompression";

interface AvatarCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function AvatarCropper({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
}: AvatarCropperProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      // Reset state
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSave = async () => {
    if (!imageFile) return;
    
    setIsProcessing(true);
    try {
      // Preview viewport is 256x256 (w-64 h-64). The cropper's position is in preview pixels.
      // Our output is 400x400, so we scale offsets to keep saved result matching preview.
      const previewSize = containerRef.current?.clientWidth ?? 256;
      const outputSize = 400;
      const offsetScale = outputSize / previewSize;

      // Crop the image with current settings
      const croppedBlob = await cropCircularImage(
        imageFile,
        {
          x: position.x * offsetScale,
          y: position.y * offsetScale,
          scale: scale,
          rotation: rotation,
        },
        outputSize // Output size
      );
      
      // Compress the cropped image
      const compressedBlob = await compressImage(croppedBlob, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        maxSizeBytes: 5 * 1024 * 1024,
      });
      
      onCropComplete(compressedBlob);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройка фото профиля</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Area */}
          <div 
            ref={containerRef}
            className="relative w-64 h-64 mx-auto overflow-hidden rounded-full border-2 border-primary bg-muted cursor-move touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="absolute w-full h-full object-cover pointer-events-none select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                draggable={false}
              />
            )}
            {/* Overlay with circular cutout hint */}
            <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full pointer-events-none" />
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <ZoomOut className="h-4 w-4" />
              </span>
              <span className="text-muted-foreground">Масштаб: {scale.toFixed(1)}x</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <ZoomIn className="h-4 w-4" />
              </span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">-180°</span>
              <span className="text-muted-foreground">Поворот: {rotation}°</span>
              <span className="text-muted-foreground">180°</span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={([value]) => setRotation(value)}
              min={-180}
              max={180}
              step={1}
              className="w-full"
            />
          </div>

          {/* Reset Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetPosition}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Сбросить
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Перетащите изображение для изменения позиции
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isProcessing || !imageFile}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обработка...
              </>
            ) : (
              "Сохранить"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
