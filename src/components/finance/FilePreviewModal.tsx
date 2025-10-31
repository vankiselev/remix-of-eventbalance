import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileAttachment {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileAttachment | null;
  canDelete?: boolean;
  onDelete?: (fileId: string) => void;
}

export function FilePreviewModal({ 
  isOpen, 
  onClose, 
  file, 
  canDelete = false, 
  onDelete 
}: FilePreviewModalProps) {
  const { toast } = useToast();
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (file && isOpen) {
      loadFileUrl();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
    };
  }, [file, isOpen]);

  const loadFileUrl = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(file.storage_path, 3600); // 1 hour

      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скачать файл",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!file || !onDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('financial_attachments')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      onDelete(file.id);
      onClose();
      
      toast({
        title: "Успешно",
        description: "Файл удален"
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить файл",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = file?.mime_type.startsWith('image/');
  const isPdf = file?.mime_type === 'application/pdf';
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate flex-1 mr-4">{file?.original_filename}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                disabled={!fileUrl}
                title="Скачать"
              >
                <Download className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  title="Удалить"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : fileUrl ? (
            <div className="space-y-4">
              {/* File Info */}
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Размер:</strong> {file && formatFileSize(file.size_bytes)}</p>
                <p><strong>Тип:</strong> {file?.mime_type}</p>
              </div>

              {/* Preview */}
              {canPreview ? (
                <div className="border rounded-lg overflow-hidden">
                  {isImage ? (
                    <img 
                      src={fileUrl} 
                      alt={file?.original_filename}
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />
                  ) : isPdf ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[60vh]"
                      title={file?.original_filename}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">
                    Предпросмотр недоступен для этого типа файла
                  </p>
                  <Button onClick={handleDownload} disabled={!fileUrl}>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать файл
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Не удалось загрузить файл</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}