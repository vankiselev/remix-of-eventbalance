import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ItemPhotoUploadProps {
  value?: string;
  onChange: (file: File) => void;
  isUploading?: boolean;
}

export const ItemPhotoUpload = ({
  value,
  onChange,
  isUploading,
}: ItemPhotoUploadProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onChange(acceptedFiles[0]);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  if (value) {
    return (
      <Card className="relative overflow-hidden">
        <img
          src={value}
          alt="Preview"
          className="w-full h-64 object-cover"
        />
        {!isUploading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onChange(null as any)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="space-y-2">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {isDragActive ? (
            <>
              <Upload className="h-12 w-12 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Отпустите файл для загрузки
              </p>
            </>
          ) : (
            <>
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Перетащите фото или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, JPEG или WEBP (макс. 20MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
