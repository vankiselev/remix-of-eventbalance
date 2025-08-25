import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  expense_amount: number | null;
  income_amount: number | null;
  category: string;
  cash_type: string | null;
  notes: string | null;
  no_receipt: boolean;
  no_receipt_reason: string | null;
  attachments_count?: number;
  events?: { name: string } | null;
  created_at: string;
}

interface TransactionExportProps {
  userId?: string;
  isAdmin: boolean;
}

export function TransactionExport({ userId, isAdmin }: TransactionExportProps) {
  const { toast } = useToast();

  const fetchTransactionsForExport = async () => {
    try {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .order("operation_date", { ascending: false });

      // If not admin or specific userId provided, filter by user
      if (!isAdmin || userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to flatten attachments_count
      const transformedData = (data || []).map(transaction => ({
        ...transaction,
        attachments_count: transaction.attachments_count?.[0]?.count || 0
      }));

      return transformedData;
    } catch (error) {
      console.error("Error fetching transactions for export:", error);
      throw error;
    }
  };

  const exportToCSV = async () => {
    try {
      const transactions = await fetchTransactionsForExport();
      
      const headers = [
        'Дата операции',
        'Проект',
        'Чей проект',
        'Описание',
        'Траты',
        'Приход',
        'Категория',
        'Касса',
        'Количество вложений',
        'Нет чека',
        'Причина отсутствия чека',
        'Заметки',
        'Дата создания'
      ];

      const csvData = transactions.map(transaction => [
        new Date(transaction.operation_date).toLocaleDateString("ru-RU"),
        transaction.events?.name || '',
        transaction.project_owner || '',
        transaction.description || '',
        transaction.expense_amount ? formatCurrency(transaction.expense_amount) : '',
        transaction.income_amount ? formatCurrency(transaction.income_amount) : '',
        transaction.category || '',
        transaction.cash_type || '',
        transaction.attachments_count || 0,
        transaction.no_receipt ? 'Да' : 'Нет',
        transaction.no_receipt_reason || '',
        transaction.notes || '',
        new Date(transaction.created_at).toLocaleDateString("ru-RU")
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Успешно",
        description: "Данные экспортированы в CSV файл"
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={exportToCSV}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Экспорт CSV
    </Button>
  );
}