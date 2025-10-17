import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UploadIconPickerProps {
  categoryId: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
}

export const UploadIconPicker = ({ categoryId, currentUrl, onUploadComplete }: UploadIconPickerProps) => {
  const { uploadIconFile } = useCategoryIcons();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 500KB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите изображение (SVG или PNG)');
      return;
    }

    try {
      setUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const url = await uploadIconFile(file, categoryId);
      onUploadComplete(url);
      toast.success('Иконка загружена');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  }, [categoryId, uploadIconFile, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/svg+xml': ['.svg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                или нажмите для выбора
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              SVG или PNG • Макс. 500KB
            </p>
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="relative border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Превью:</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setPreviewUrl('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center h-32 bg-background rounded">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>💡 <strong>Рекомендации:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Используйте SVG для лучшего качества</li>
          <li>Простые монохромные иконки работают лучше всего</li>
          <li>Размер файла должен быть меньше 500KB</li>
        </ul>
      </div>
    </div>
  );
};
