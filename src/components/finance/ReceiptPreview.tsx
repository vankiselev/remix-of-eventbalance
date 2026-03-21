// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { AttachmentsView } from './AttachmentsView';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ReceiptPreviewProps {
  transactionId: string;
  attachmentsCount?: number;
  noReceipt?: boolean;
  noReceiptReason?: string;
  receiptImages?: string[] | null;
}

export function ReceiptPreview({ 
  transactionId, 
  attachmentsCount = 0, 
  noReceipt,
  noReceiptReason,
  receiptImages,
}: ReceiptPreviewProps) {
  const hasImages = (receiptImages && receiptImages.length > 0) || attachmentsCount > 0;
  const firstImage = receiptImages?.[0];
  const totalCount = receiptImages?.length || attachmentsCount;

  const renderPreview = () => {
    if (noReceipt) {
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 text-xs">
          Нет чека
        </Badge>
      );
    }

    if (!hasImages) {
      return <span className="text-gray-400">—</span>;
    }

    if (firstImage && firstImage.startsWith('data:image/')) {
      return (
        <div className="flex items-center gap-2">
          <img 
            src={firstImage} 
            alt="Превью чека" 
            className="w-8 h-8 object-cover rounded border"
          />
          {totalCount > 1 && (
            <span className="text-xs text-gray-500">+{totalCount - 1}</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <ImageIcon className="w-6 h-6 text-gray-500" />
        {totalCount > 1 && (
          <span className="text-xs text-gray-500">+{totalCount - 1}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center">
      {(hasImages || noReceipt) ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-2">
              {renderPreview()}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AttachmentsView
              transactionId={transactionId}
              noReceipt={noReceipt}
              noReceiptReason={noReceiptReason}
              receiptImages={receiptImages}
              canDelete={false}
            />
          </DialogContent>
        </Dialog>
      ) : (
        renderPreview()
      )}
    </div>
  );
}
