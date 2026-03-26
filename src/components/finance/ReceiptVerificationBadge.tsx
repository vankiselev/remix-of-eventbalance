import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { getVerificationStatusInfo } from '@/utils/receiptQrParser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReceiptVerificationBadgeProps {
  status: string;
  errorMessage?: string | null;
  compact?: boolean;
}

const iconMap = {
  check: CheckCircle,
  x: XCircle,
  clock: Clock,
  alert: AlertTriangle,
  search: Search,
  loader: Loader2,
};

const colorClasses: Record<string, string> = {
  success: 'bg-green-500/15 text-green-700 border-green-300 dark:text-green-400 dark:border-green-700',
  warning: 'bg-yellow-500/15 text-yellow-700 border-yellow-300 dark:text-yellow-400 dark:border-yellow-700',
  destructive: 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400 dark:border-red-700',
  secondary: 'bg-muted text-muted-foreground border-border',
  default: 'bg-muted/50 text-muted-foreground border-border',
};

export function ReceiptVerificationBadge({ status, errorMessage, compact }: ReceiptVerificationBadgeProps) {
  const info = getVerificationStatusInfo(status);
  const Icon = iconMap[info.icon];

  const badge = (
    <Badge
      variant="outline"
      className={`${colorClasses[info.color]} gap-1 text-xs ${compact ? 'px-1.5 py-0' : ''}`}
    >
      <Icon className={`h-3 w-3 ${info.icon === 'loader' ? 'animate-spin' : ''}`} />
      {!compact && info.label}
    </Badge>
  );

  if (errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[250px]">{errorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
