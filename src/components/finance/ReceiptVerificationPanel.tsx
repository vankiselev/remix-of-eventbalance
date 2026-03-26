import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReceiptVerificationBadge } from './ReceiptVerificationBadge';
import { useReceiptVerification } from '@/hooks/useReceiptVerification';
import { parseReceiptQr, validateReceiptData } from '@/utils/receiptQrParser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  RefreshCw, 
  Loader2, 
  FileCheck, 
  KeyRound,
  Camera,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ReceiptVerificationPanelProps {
  transactionId: string;
  expenseAmount?: number | null;
  compact?: boolean;
}

export function ReceiptVerificationPanel({ 
  transactionId, 
  expenseAmount,
  compact = false,
}: ReceiptVerificationPanelProps) {
  const { verification, isLoading, refetch } = useReceiptVerification(transactionId);
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const [showManualInput, setShowManualInput] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [manualFn, setManualFn] = useState('');
  const [manualFd, setManualFd] = useState('');
  const [manualFp, setManualFp] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualSum, setManualSum] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQrInput = useCallback(() => {
    if (!qrInput.trim()) return;
    
    const parsed = parseReceiptQr(qrInput);
    if (parsed) {
      setManualFn(parsed.fn);
      setManualFd(parsed.fd);
      setManualFp(parsed.fp);
      setManualDate(parsed.date);
      setManualSum(String(parsed.sum));
      setValidationErrors([]);
      toast({ title: 'QR-код распознан', description: 'Реквизиты чека заполнены автоматически' });
      // Auto-verify
      verifyReceipt(parsed);
    } else {
      setValidationErrors(['Не удалось распознать QR-код. Введите реквизиты вручную.']);
      setShowManualInput(true);
    }
  }, [qrInput]);

  const verifyReceipt = async (receiptData?: {
    fn: string;
    fd: string;
    fp: string;
    date: string;
    sum: number;
    operationType: number;
  }) => {
    const data = receiptData || {
      fn: manualFn.trim(),
      fd: manualFd.trim(),
      fp: manualFp.trim(),
      date: manualDate || new Date().toISOString(),
      sum: parseFloat(manualSum) || expenseAmount || 0,
      operationType: 1,
    };

    const validation = validateReceiptData(data);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsVerifying(true);
    setValidationErrors([]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Сессия истекла' });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          transactionId,
          receipt: data,
          tenantId: currentTenant?.id,
        }),
      });

      const result = await response.json();

      if (result.configurationRequired) {
        toast({
          variant: 'destructive',
          title: 'ФНС API не настроен',
          description: 'Для проверки чеков необходимо настроить доступ к API ФНС. Обратитесь к администратору.',
        });
      } else if (result.success) {
        toast({
          title: '✅ Чек подтверждён ФНС',
          description: 'Кассовый чек найден и подтверждён в базе ФНС.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Результат проверки',
          description: result.message || 'Не удалось проверить чек',
        });
      }

      refetch();
    } catch (error) {
      console.error('Receipt verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось отправить запрос на проверку',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // First save receipt data locally before sending to FNS
  const saveAndVerify = async () => {
    // Save QR/manual data to receipt_verifications first
    const inputMethod = qrInput.trim() ? 'qr_scan' : 'manual';
    
    try {
      await (supabase.from('receipt_verifications') as any).upsert({
        transaction_id: transactionId,
        fn: manualFn.trim(),
        fd: manualFd.trim(),
        fp: manualFp.trim(),
        receipt_date: manualDate || null,
        receipt_sum: parseFloat(manualSum) || expenseAmount || null,
        operation_type: 1,
        qr_raw: qrInput.trim() || null,
        qr_parsed: !!qrInput.trim(),
        input_method: inputMethod,
        status: 'not_verified',
        created_by: user?.id,
        tenant_id: currentTenant?.id,
      }, { onConflict: 'transaction_id' });
    } catch {
      // Ignore upsert errors, the edge function will handle creation
    }

    await verifyReceipt();
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  // Compact mode - just show badge
  if (compact) {
    if (!verification) return null;
    return (
      <ReceiptVerificationBadge 
        status={verification.status} 
        errorMessage={verification.fns_error_message}
        compact
      />
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Проверка чека ФНС
          {verification && (
            <ReceiptVerificationBadge 
              status={verification.status}
              errorMessage={verification.fns_error_message}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Already verified */}
        {verification?.status === 'verified_fns' && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Чек подтверждён ФНС</p>
              {verification.verified_at && (
                <p className="text-xs text-muted-foreground">
                  Проверено: {new Date(verification.verified_at).toLocaleString('ru-RU')}
                </p>
              )}
              {verification.fn && (
                <p className="text-xs text-muted-foreground mt-1">
                  ФН: {verification.fn} · ФД: {verification.fd} · ФП: {verification.fp}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error / not found state */}
        {verification && ['not_found_fns', 'service_error', 'invalid_requisites'].includes(verification.status) && (
          <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {verification.status === 'not_found_fns' && 'Чек не найден в базе ФНС'}
                {verification.status === 'service_error' && 'Ошибка сервиса ФНС'}
                {verification.status === 'invalid_requisites' && 'Некорректные реквизиты чека'}
              </p>
              {verification.fns_error_message && (
                <p className="text-xs text-muted-foreground mt-0.5">{verification.fns_error_message}</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 gap-1"
                onClick={() => verifyReceipt()}
                disabled={isVerifying}
              >
                <RefreshCw className={`h-3 w-3 ${isVerifying ? 'animate-spin' : ''}`} />
                Повторить проверку
              </Button>
            </div>
          </div>
        )}

        {/* Verifying state */}
        {verification?.status === 'verifying' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Проверка в процессе...</p>
          </div>
        )}

        {/* No verification yet or need to input data */}
        {(!verification || verification.status === 'not_verified') && (
          <>
            {/* QR input */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <QrCode className="h-3 w-3" />
                Вставьте данные QR-кода чека
              </Label>
              <div className="flex gap-2">
                <Input
                  ref={qrInputRef}
                  placeholder="t=20240115T2110&s=1030.00&fn=9251440300046840&i=29414&fp=1250830908&n=1"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleQrInput}
                  disabled={!qrInput.trim() || isVerifying}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span>или</span>
              <Separator className="flex-1" />
            </div>

            {/* Manual input toggle */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <KeyRound className="h-3 w-3" />
              Ввести реквизиты вручную
            </Button>

            {/* Manual input form */}
            {showManualInput && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">ФН *</Label>
                    <Input
                      placeholder="9251440300046840"
                      value={manualFn}
                      onChange={(e) => setManualFn(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ФД *</Label>
                    <Input
                      placeholder="29414"
                      value={manualFd}
                      onChange={(e) => setManualFd(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ФП *</Label>
                    <Input
                      placeholder="1250830908"
                      value={manualFp}
                      onChange={(e) => setManualFp(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Дата чека</Label>
                    <Input
                      type="datetime-local"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Сумма (₽)</Label>
                    <Input
                      placeholder={expenseAmount ? String(expenseAmount) : '0.00'}
                      value={manualSum}
                      onChange={(e) => setManualSum(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <Button
                  className="w-full gap-1"
                  size="sm"
                  onClick={saveAndVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileCheck className="h-3 w-3" />
                  )}
                  Проверить чек в ФНС
                </Button>
              </div>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
