/**
 * Parser for Russian fiscal receipt QR codes
 * 
 * QR code format: t=YYYYMMDDTHHMM&s=SUM&fn=FN&i=FD&fp=FP&n=TYPE
 * 
 * t  - date/time of receipt (format: YYYYMMDDTHHMM or YYYYMMDDTHHMMSS)
 * s  - total sum (in rubles, e.g., 1030.00)
 * fn - fiscal storage number (ФН)
 * i  - fiscal document number (ФД)
 * fp - fiscal signature (ФП)
 * n  - operation type (1=приход, 2=возврат прихода, 3=расход, 4=возврат расхода)
 */

export interface ParsedReceipt {
  fn: string;
  fd: string;
  fp: string;
  date: string;      // ISO date string
  sum: number;        // в рублях
  operationType: number;
  rawQr: string;
}

export function parseReceiptQr(qrString: string): ParsedReceipt | null {
  if (!qrString || typeof qrString !== 'string') return null;

  const trimmed = qrString.trim();
  
  // Parse key=value pairs
  const params = new URLSearchParams(trimmed);
  
  const t = params.get('t');
  const s = params.get('s');
  const fn = params.get('fn');
  const fd = params.get('i');
  const fp = params.get('fp');
  const n = params.get('n');

  // fn, fd, fp are required
  if (!fn || !fd || !fp) return null;

  // Parse date
  let date = '';
  if (t) {
    // Format: YYYYMMDDTHHMM or YYYYMMDDTHHMMSS
    const match = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      date = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
    } else {
      date = t;
    }
  }

  // Parse sum
  const sum = s ? parseFloat(s) : 0;

  // Parse operation type
  const operationType = n ? parseInt(n) : 1;

  return {
    fn,
    fd,
    fp,
    date,
    sum,
    operationType: isNaN(operationType) ? 1 : operationType,
    rawQr: trimmed,
  };
}

/**
 * Validate receipt requisites
 */
export function validateReceiptData(data: {
  fn?: string;
  fd?: string;
  fp?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.fn || data.fn.trim().length === 0) {
    errors.push('Номер ФН обязателен');
  } else if (!/^\d{10,16}$/.test(data.fn.trim())) {
    errors.push('ФН должен содержать от 10 до 16 цифр');
  }

  if (!data.fd || data.fd.trim().length === 0) {
    errors.push('Номер ФД обязателен');
  } else if (!/^\d{1,10}$/.test(data.fd.trim())) {
    errors.push('ФД должен содержать от 1 до 10 цифр');
  }

  if (!data.fp || data.fp.trim().length === 0) {
    errors.push('ФП обязателен');
  } else if (!/^\d{1,10}$/.test(data.fp.trim())) {
    errors.push('ФП должен содержать от 1 до 10 цифр');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get human-readable status label and color
 */
export function getVerificationStatusInfo(status: string): {
  label: string;
  color: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  icon: 'check' | 'x' | 'clock' | 'alert' | 'search' | 'loader';
} {
  switch (status) {
    case 'verified_fns':
      return { label: 'Проверен ФНС', color: 'success', icon: 'check' };
    case 'verifying':
      return { label: 'Проверяется...', color: 'secondary', icon: 'loader' };
    case 'not_found_fns':
      return { label: 'Не найден в ФНС', color: 'warning', icon: 'alert' };
    case 'invalid_requisites':
      return { label: 'Ошибка реквизитов', color: 'destructive', icon: 'x' };
    case 'service_error':
      return { label: 'Ошибка сервиса', color: 'warning', icon: 'alert' };
    case 'manual_review':
      return { label: 'Ручная проверка', color: 'secondary', icon: 'search' };
    case 'not_verified':
    default:
      return { label: 'Не проверен', color: 'default', icon: 'clock' };
  }
}
