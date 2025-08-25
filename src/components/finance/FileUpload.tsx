import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export function FileUpload({ 
  files, 
  onFilesChange, 
  maxFiles = 5, 
  maxSize = 10,
  disabled = false 
}: FileUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);

    // Check if adding these files would exceed the limit
    if (files.length + acceptedFiles.length > maxFiles) {
      setUploadError(`Максимум ${maxFiles} файлов разрешено`);
      return;
    }

    // Check file sizes
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setUploadError(`Максимальный размер файла: ${maxSize} МБ`);
      return;
    }

    // Add new files
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0
    }));

    onFilesChange([...files, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(uploadedFile => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10 + Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        
        onFilesChange(files.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, progress }
            : f
        ));
      }, 200);
    });

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(f => f.errors[0]?.message).join(', ');
      setUploadError(errors);
    }
  }, [files, maxFiles, maxSize, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    maxFiles: maxFiles - files.length,
    accept: {
      '*/*': []
    }
  });

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          {isDragActive ? (
            'Отпустите файлы здесь...'
          ) : (
            <>
              Перетащите файлы сюда или{' '}
              <span className="text-primary font-medium">нажмите для выбора</span>
            </>
          )}
        </p>
        <p className="text-xs text-gray-500">
          До {maxFiles} файлов, максимум {maxSize} МБ каждый
        </p>
      </div>

      {/* Mobile Camera/Gallery Support */}
      <div className="block sm:hidden">
        <input
          type="file"
          accept="*/*"
          capture="environment"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              onDrop(files, []);
            }
          }}
          className="hidden"
          id="mobile-file-input"
          disabled={disabled || files.length >= maxFiles}
        />
        <Button 
          type="button"
          variant="outline" 
          className="w-full"
          onClick={() => document.getElementById('mobile-file-input')?.click()}
          disabled={disabled || files.length >= maxFiles}
        >
          <Image className="h-4 w-4 mr-2" />
          Выбрать фото/файл
        </Button>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Загруженные файлы ({files.length}/{maxFiles}):</h4>
          {files.map((uploadedFile) => (
            <div key={uploadedFile.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getFileIcon(uploadedFile.file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.file.size)} • {uploadedFile.file.type || 'Unknown'}
                </p>
                {uploadedFile.progress < 100 && (
                  <Progress value={uploadedFile.progress} className="mt-1 h-1" />
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-red-500 mt-1">{uploadedFile.error}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(uploadedFile.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}