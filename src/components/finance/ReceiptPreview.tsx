// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    if (attachmentsCount > 0) {
      fetchFirstAttachment();
    }
  }, [transactionId, attachmentsCount]);

  const isMissingRelationError = (err: any, relationName: string) => {
    const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
    return err?.code === '42P01' || (text.includes('relation') && text.includes(relationName.toLowerCase()) && text.includes('does not exist'));
  };

  const fetchFirstAttachment = async () => {
    if (loading) return;

    setLoading(true);
    try {
      let file: any = null;

      const { data: financialData, error: financialError } = await (supabase
        .from('financial_attachments') as any)
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!financialError && financialData?.length > 0) {
        file = {
          id: financialData[0].id,
          storage_path: financialData[0].storage_path || financialData[0].file_url,
          original_filename: financialData[0].original_filename || financialData[0].file_name,
          mime_type: financialData[0].mime_type || financialData[0].file_type || 'application/octet-stream',
          size_bytes: financialData[0].size_bytes || financialData[0].file_size || 0,
        };
      } else if (isMissingRelationError(financialError, 'financial_attachments')) {
        const { data: legacyData } = await (supabase
          .from('transaction_attachments') as any)
          .select('*')
          .eq('transaction_id', transactionId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (legacyData?.length > 0) {
          file = {
            id: legacyData[0].id,
            storage_path: legacyData[0].file_url,
            original_filename: legacyData[0].file_name,
            mime_type: legacyData[0].file_type || 'application/octet-stream',
            size_bytes: legacyData[0].file_size || 0,
          };
        }
      }

      if (!file) {
        setAttachments([]);
        setPreviewUrl(null);
        return;
      }

      setAttachments([file]);

      if (file.mime_type.startsWith('image/')) {
        if (file.storage_path?.startsWith('data:') || file.storage_path?.startsWith('http')) {
          setPreviewUrl(file.storage_path);
        } else {
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
        <Badge variant="outline" className="text-xs">
          Нет чека
        </Badge>
      );
    }

    if (attachmentsCount === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    if (loading) {
      return <div className="w-6 h-6 animate-pulse bg-muted rounded"></div>;
    }

    const firstAttachment = attachments[0];
    if (!firstAttachment) {
      return <span className="text-muted-foreground">—</span>;
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
            <span className="text-xs text-muted-foreground">+{attachmentsCount - 1}</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <FileIcon className="w-6 h-6 text-muted-foreground" />
        {attachmentsCount > 1 && (
          <span className="text-xs text-muted-foreground">+{attachmentsCount - 1}</span>
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
