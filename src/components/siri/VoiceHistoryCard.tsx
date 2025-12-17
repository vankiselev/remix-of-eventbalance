import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Mic, ArrowUpRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface VoiceTransaction {
  id: string;
  description: string;
  expense_amount: number | null;
  income_amount: number | null;
  category: string;
  cash_type: string;
  is_draft: boolean;
  verification_status: string | null;
  created_at: string;
  operation_date: string;
}

export function VoiceHistoryCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['voice-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('id, description, expense_amount, income_amount, category, cash_type, is_draft, verification_status, created_at, operation_date')
        .eq('created_by', user.id)
        .eq('no_receipt_reason', 'Транзакция создана через голосовой ввод Siri')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as VoiceTransaction[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const getStatusBadge = (tx: VoiceTransaction) => {
    if (tx.is_draft) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Черновик</Badge>;
    }
    if (tx.verification_status === 'approved') {
      return <Badge variant="default" className="bg-green-500">Утверждено</Badge>;
    }
    if (tx.verification_status === 'rejected') {
      return <Badge variant="destructive">Отклонено</Badge>;
    }
    return <Badge variant="secondary">На проверке</Badge>;
  };

  const openTransaction = (id: string) => {
    navigate(`/finances?transaction=${id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            История голосовых транзакций
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          История голосовых транзакций
        </CardTitle>
        <CardDescription>
          Последние транзакции, созданные через Siri
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет голосовых транзакций</p>
            <p className="text-sm">Создайте первую транзакцию через Siri или виджет выше</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => {
              const amount = tx.expense_amount || tx.income_amount || 0;
              const isExpense = (tx.expense_amount || 0) > 0;
              
              return (
                <button
                  key={tx.id}
                  onClick={() => openTransaction(tx.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isExpense ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                    <Mic className={`h-5 w-5 ${isExpense ? 'text-destructive' : 'text-green-600'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{tx.description}</span>
                      {getStatusBadge(tx)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(tx.created_at), 'd MMM HH:mm', { locale: ru })}</span>
                      <span>•</span>
                      <span className="truncate">{tx.cash_type}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`font-bold ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{amount.toLocaleString('ru-RU')} ₽
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
