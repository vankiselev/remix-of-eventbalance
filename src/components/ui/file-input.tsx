import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInputProps {
  id?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  value?: File | File[] | null;
  onChange: (files: File | File[] | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const FileInput = ({
  id,
  accept,
  multiple = false,
  maxSize = 10,
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Выберите файл",
}: FileInputProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    // Check file size
    const oversizedFiles = files.filter(
      (file) => file.size > maxSize * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      alert(
        `Файл(ы) превышают максимальный размер ${maxSize}MB: ${oversizedFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    if (multiple) {
      onChange(files);
    } else {
      onChange(files[0]);
    }
  };

  const handleRemove = (index?: number) => {
    if (multiple && Array.isArray(value) && index !== undefined) {
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const getFileList = (): File[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const fileList = getFileList();

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        <label
          htmlFor={id}
          className={cn(
            "flex flex-col items-center justify-center p-6 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {placeholder}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Перетащите файл или нажмите для выбора
              </p>
              {accept && (
                <p className="text-xs text-muted-foreground mt-1">
                  {accept.split(",").join(", ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Максимальный размер: {maxSize}MB
              </p>
            </div>
          </div>
        </label>
      </div>

      {fileList.length > 0 && (
        <div className="space-y-2">
          {fileList.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(multiple ? index : undefined)}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
