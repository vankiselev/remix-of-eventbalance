import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Trash2, Paperclip, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FilePreviewModal } from './FilePreviewModal';

interface FileAttachment {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
  preview_url?: string;
}

interface AttachmentsViewProps {
  transactionId: string;
  noReceipt?: boolean;
  noReceiptReason?: string;
  canDelete?: boolean;
  onAttachmentsChange?: () => void;
}

export function AttachmentsView({ 
  transactionId, 
  noReceipt, 
  noReceiptReason,
  canDelete = false,
  onAttachmentsChange 
}: AttachmentsViewProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (transactionId) {
      fetchAttachments();
    }
  }, [transactionId]);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('financial_attachments') as any)
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setAttachments([]);
        return;
      }
      
      // Batch load preview URLs for all images at once
      const imagePaths = data
        .filter((file: any) => file.mime_type?.startsWith('image/'))
        .map((file: any) => file.storage_path);
      
      let previewUrlMap = new Map<string, string>();
      
      if (imagePaths.length > 0) {
        try {
          // Use createSignedUrls (batch) instead of individual requests
          const { data: urlsData, error: urlError } = await supabase.storage
            .from('receipts')
            .createSignedUrls(imagePaths, 3600);
          
          if (urlError) throw urlError;
          
          // Create map of path -> signed URL
          urlsData?.forEach((item, index) => {
            if (item.signedUrl) {
              previewUrlMap.set(imagePaths[index], item.signedUrl);
            }
          });
        } catch (err) {
          console.error('Error batch loading previews:', err);
        }
      }
      
      // Apply preview URLs to attachments
      const attachmentsWithPreviews = data.map((file: any) => ({
        ...file,
        preview_url: file.mime_type?.startsWith('image/') 
          ? previewUrlMap.get(file.storage_path) 
          : undefined
      }));
      
      setAttachments(attachmentsWithPreviews as any);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить вложения",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileAttachment) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(file.storage_path, 3600);

      if (error) throw error;

      const response = await fetch(data.signedUrl);
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

  const handleDelete = async (fileId: string) => {
    try {
      const file = attachments.find(f => f.id === fileId);
      if (!file) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await (supabase
        .from('financial_attachments') as any)
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setAttachments(prev => prev.filter(a => a.id !== fileId));
      onAttachmentsChange?.();
      
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    if (mimeType === 'application/pdf') {
      return '📄';
    }
    return '📎';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAttachments = attachments.length > 0;
  const showNoReceiptInfo = noReceipt && noReceiptReason;

  if (!hasAttachments && !showNoReceiptInfo) {
    return (
      <div className="text-center py-4 text-gray-500">
        Нет вложений
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* No Receipt Info */}
      {showNoReceiptInfo && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <Badge variant="outline" className="border-amber-300 text-amber-700 mb-2">
                Нет чека
              </Badge>
              <p className="text-sm text-gray-700">{noReceiptReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* File Attachments */}
      {hasAttachments && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">
              Вложения ({attachments.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {attachments.map((file) => {
              const isImage = file.mime_type.startsWith('image/');
              
              return (
                <div
                  key={file.id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Image Preview */}
                  {isImage && file.preview_url ? (
                    <div className="relative">
                      <img 
                        src={file.preview_url} 
                        alt={file.original_filename}
                        className="w-full h-auto max-h-96 object-contain bg-gray-50 cursor-pointer"
                        onClick={() => handleFileClick(file)}
                      />
                    </div>
                  ) : null}
                  
                  {/* File Info and Actions */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {!isImage && <span className="text-xl">{getFileIcon(file.mime_type)}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.original_filename}>
                          {file.original_filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size_bytes)} • {file.mime_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFileClick(file)}
                        title="Открыть"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        title="Скачать"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        canDelete={canDelete}
        onDelete={(fileId) => {
          handleDelete(fileId);
          setAttachments(prev => prev.filter(a => a.id !== fileId));
          onAttachmentsChange?.();
        }}
      />
    </div>
  );
}