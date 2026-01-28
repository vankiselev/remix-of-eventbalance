// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, FileIcon, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AttachmentsView } from './AttachmentsView';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface FileAttachment {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

interface ReceiptPreviewProps {
  transactionId: string;
  attachmentsCount?: number;
  noReceipt?: boolean;
  noReceiptReason?: string;
}

export function ReceiptPreview({ 
  transactionId, 
  attachmentsCount = 0, 
  noReceipt,
  noReceiptReason 
}: ReceiptPreviewProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (attachmentsCount > 0) {
      fetchFirstAttachment();
    }
  }, [transactionId, attachmentsCount]);

  const fetchFirstAttachment = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAttachments(data);
        
        // If it's an image, get preview URL
        const file = data[0];
        if (file.mime_type.startsWith('image/')) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('receipts')
            .createSignedUrl(file.storage_path, 3600);
          
          if (!urlError && urlData) {
            setPreviewUrl(urlData.signedUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching attachment:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (noReceipt) {
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 text-xs">
          Нет чека
        </Badge>
      );
    }

    if (attachmentsCount === 0) {
      return <span className="text-gray-400">—</span>;
    }

    if (loading) {
      return <div className="w-6 h-6 animate-pulse bg-gray-200 rounded"></div>;
    }

    const firstAttachment = attachments[0];
    if (!firstAttachment) {
      return <span className="text-gray-400">—</span>;
    }

    if (firstAttachment.mime_type.startsWith('image/') && previewUrl) {
      return (
        <div className="flex items-center gap-2">
          <img 
            src={previewUrl} 
            alt="Превью чека" 
            className="w-8 h-8 object-cover rounded border"
          />
          {attachmentsCount > 1 && (
            <span className="text-xs text-gray-500">+{attachmentsCount - 1}</span>
          )}
        </div>
      );
    }

    // For non-image files, show icon
    return (
      <div className="flex items-center gap-2">
        {firstAttachment.mime_type === 'application/pdf' ? (
          <FileIcon className="w-6 h-6 text-red-500" />
        ) : (
          <FileIcon className="w-6 h-6 text-gray-500" />
        )}
        {attachmentsCount > 1 && (
          <span className="text-xs text-gray-500">+{attachmentsCount - 1}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center">
      {(attachmentsCount > 0 || noReceipt) ? (
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