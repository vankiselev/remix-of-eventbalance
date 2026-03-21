// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Trash2, Paperclip, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttachmentsViewProps {
  transactionId: string;
  noReceipt?: boolean;
  noReceiptReason?: string;
  canDelete?: boolean;
  onAttachmentsChange?: () => void;
  receiptImages?: string[] | null;
}

export function AttachmentsView({ 
  transactionId, 
  noReceipt, 
  noReceiptReason,
  canDelete = false,
  onAttachmentsChange,
  receiptImages,
}: AttachmentsViewProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (receiptImages && receiptImages.length > 0) {
      setImages(receiptImages);
    } else if (transactionId) {
      // Try loading from receipt_images column
      loadReceiptImages();
    }
  }, [transactionId, receiptImages]);

  const loadReceiptImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('receipt_images')
        .eq('id', transactionId)
        .single();

      if (error) throw error;

      if (data?.receipt_images && data.receipt_images.length > 0) {
        setImages(data.receipt_images);
      }
    } catch (error) {
      console.error('Error loading receipt images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      const updated = images.filter((_, i) => i !== index);
      
      const { error } = await supabase
        .from('financial_transactions')
        .update({ 
          receipt_images: updated.length > 0 ? updated : null,
          attachments_count: updated.length,
        })
        .eq('id', transactionId);

      if (error) throw error;

      setImages(updated);
      onAttachmentsChange?.();
      toast({ title: "Успешно", description: "Файл удален" });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({ title: "Ошибка", description: "Не удалось удалить файл", variant: "destructive" });
    }
  };

  const handleDownload = (dataUrl: string, index: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `receipt_${index + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const showNoReceiptInfo = noReceipt && noReceiptReason;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasImages = images.length > 0;

  if (!hasImages && !showNoReceiptInfo) {
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

      {/* Receipt Images */}
      {hasImages && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">
              Вложения ({images.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {images.map((dataUrl, index) => {
              const isImage = dataUrl.startsWith('data:image/');
              
              return (
                <div
                  key={index}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {isImage && (
                    <div className="relative cursor-pointer" onClick={() => setFullscreenIndex(index)}>
                      <img 
                        src={dataUrl} 
                        alt={`Чек ${index + 1}`}
                        className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{isImage ? '🖼️' : '📎'}</span>
                      <p className="text-sm font-medium">Чек {index + 1}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isImage && (
                        <Button variant="ghost" size="icon" onClick={() => setFullscreenIndex(index)} title="Открыть">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(dataUrl, index)} title="Скачать">
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index)}
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

      {/* Fullscreen Preview */}
      {fullscreenIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFullscreenIndex(null)}
        >
          <img 
            src={images[fullscreenIndex]} 
            alt="Просмотр чека"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl"
            onClick={() => setFullscreenIndex(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
