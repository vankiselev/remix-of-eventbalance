import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  creator_name?: string;
  operation_date: string;
  project_name?: string;
  project_owner?: string;
  description: string;
  expense_amount?: number;
  income_amount?: number;
  category?: string;
  notes?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { rows, user_id } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: rows array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ImportResult = {
      total: rows.length,
      inserted: 0,
      failed: 0,
      errors: []
    };

    // Функция парсинга даты
    const parseDate = (dateStr: string): string | null => {
      if (!dateStr) return null;
      const s = String(dateStr).trim();
      if (!s) return null;

      // Excel serial numbers
      if (/^\d+(\.\d+)?$/.test(s)) {
        const num = parseFloat(s);
        if (num > 1 && num < 100000) {
          try {
            const excelEpochUTC = Date.UTC(1899, 11, 30);
            const dt = new Date(excelEpochUTC + num * 86400000);
            const y = dt.getUTCFullYear();
            const m = dt.getUTCMonth() + 1;
            const d = dt.getUTCDate();
            return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          } catch (error) {
            console.warn('Error parsing Excel serial date:', s, error);
          }
        }
      }

      // Standard date formats
      const formats = [
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // dd.mm.yyyy
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // dd-mm-yyyy
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
      ];

      for (let i = 0; i < formats.length; i++) {
        const match = s.match(formats[i]);
        if (match) {
          let year, month, day;
          if (i === 3) {
            [, year, month, day] = match;
          } else {
            [, day, month, year] = match;
          }
          
          const y = parseInt(year);
          const m = parseInt(month);
          const d = parseInt(day);
          if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          }
        }
      }

      return null;
    };

    // Функция маппинга cash_type
    const mapCashType = (projectOwner: string): string | null => {
      if (!projectOwner) return null;
      const s = String(projectOwner).toLowerCase().trim();
      
      // Гибкое сопоставление для наличных касс
      if (s.includes('настя') || s === 'наличка настя') return 'Наличка Настя';
      if (s.includes('лера') || s === 'наличка лера') return 'Наличка Лера';
      if (s.includes('ваня') || s === 'наличка ваня') return 'Наличка Ваня';
      
      // Если начинается с "наличка" - попробуем распознать
      if (s.startsWith('наличка')) {
        const name = s.replace('наличка', '').trim();
        if (name) {
          return 'Наличка ' + name.charAt(0).toUpperCase() + name.slice(1);
        }
      }
      
      return null;
    };

    // Подготовка данных для batch-вставки
    const validRows: any[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row: ImportRow = rows[i];
      
      try {
        const operationDate = parseDate(row.operation_date);
        if (!operationDate) {
          throw new Error("Некорректная дата");
        }

        const expenseAmount = row.expense_amount || 0;
        const incomeAmount = row.income_amount || 0;

        if (expenseAmount === 0 && incomeAmount === 0) {
          throw new Error("Не указана сумма операции");
        }

        // Описание по умолчанию если не указано
        const description = row.description || (expenseAmount > 0 ? 'Расход' : 'Приход');

        const cashType = mapCashType(row.project_owner || '');
        const projectOwner = cashType || row.project_owner || 'Без кассы';

        // Если есть и доход и расход - создаём две транзакции
        if (expenseAmount > 0 && incomeAmount > 0) {
          validRows.push({
            created_by: user_id,
            operation_date: operationDate,
            static_project_name: row.project_name || null,
            project_owner: projectOwner,
            description: description,
            category: row.category || 'Разное',
            cash_type: cashType,
            expense_amount: expenseAmount,
            income_amount: null,
            notes: row.notes || null,
            verification_status: 'pending',
            requires_verification: true
          });
          validRows.push({
            created_by: user_id,
            operation_date: operationDate,
            static_project_name: row.project_name || null,
            project_owner: projectOwner,
            description: description,
            category: row.category || 'Разное',
            cash_type: cashType,
            expense_amount: null,
            income_amount: incomeAmount,
            notes: row.notes || null,
            verification_status: 'pending',
            requires_verification: true
          });
        } else {
          validRows.push({
            created_by: user_id,
            operation_date: operationDate,
            static_project_name: row.project_name || null,
            project_owner: projectOwner,
            description: description,
            category: row.category || 'Разное',
            cash_type: cashType,
            expense_amount: expenseAmount || null,
            income_amount: incomeAmount || null,
            notes: row.notes || null,
            verification_status: 'pending',
            requires_verification: true
          });
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          reason: error.message || 'Ошибка валидации'
        });
      }
    }

    // Batch вставка (по 500 строк за раз для надежности)
    const BATCH_SIZE = 500;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('financial_transactions')
        .insert(batch);

      if (error) {
        console.error('Batch insert error:', error);
        // Добавляем все строки из батча в ошибки
        for (let j = 0; j < batch.length; j++) {
          result.failed++;
          result.errors.push({
            row: i + j + 1,
            reason: error.message || 'Ошибка вставки'
          });
        }
      } else {
        result.inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
