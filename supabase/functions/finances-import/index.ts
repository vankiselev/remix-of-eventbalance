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

// Словарь синонимов для категорий
const categoryAliases: { [key: string]: string[] } = {
  'зп': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'зарплата': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'оклад': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'премия': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'еда': ['Еда / Напитки для проекта', 'Еда'],
  'напитки': ['Еда / Напитки для проекта', 'Еда'],
  'доставка': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'трансфер': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'транспорт': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'такси': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'реквизит': ['Реквизит / Расходники / Материалы', 'Реквизит'],
  'материалы': ['Реквизит / Расходники / Материалы', 'Материалы'],
  'расходники': ['Реквизит / Расходники / Материалы', 'Расходники'],
  'аренда': ['Аренда', 'Аренда оборудования'],
  'оборудование': ['Оборудование', 'Аренда оборудования'],
  'реклама': ['Реклама / Маркетинг', 'Реклама'],
  'маркетинг': ['Реклама / Маркетинг', 'Маркетинг'],
  'связь': ['Связь / Интернет / Телефон', 'Связь'],
  'интернет': ['Связь / Интернет / Телефон', 'Интернет'],
  'телефон': ['Связь / Интернет / Телефон', 'Телефон'],
  'услуги': ['Услуги сторонних организаций', 'Услуги'],
  'подрядчик': ['Услуги сторонних организаций', 'Подрядчики'],
  'разное': ['Разное', 'Прочее'],
  'прочее': ['Разное', 'Прочее'],
};

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

    console.log(`Starting import: ${rows.length} rows for user ${user_id}`);

    const result: ImportResult = {
      total: rows.length,
      inserted: 0,
      failed: 0,
      errors: []
    };

    // Получаем список категорий из БД для fuzzy matching
    const { data: categoriesData } = await supabase
      .from('transaction_categories')
      .select('name')
      .eq('is_active', true);
    
    const categoryNames = categoriesData?.map(c => c.name) || [];
    console.log(`Loaded ${categoryNames.length} categories from DB`);

    // Функция fuzzy matching для категорий
    const findMatchingCategory = (input: string): string => {
      if (!input) return 'Разное';
      
      const s = String(input).trim();
      const sLower = s.toLowerCase();
      
      // 1. Точное совпадение
      const exactMatch = categoryNames.find(cat => cat.toLowerCase() === sLower);
      if (exactMatch) return exactMatch;
      
      // 2. Поиск по синонимам
      for (const [alias, targets] of Object.entries(categoryAliases)) {
        if (sLower.includes(alias) || alias.includes(sLower)) {
          for (const target of targets) {
            const match = categoryNames.find(cat => 
              cat.toLowerCase().includes(target.toLowerCase()) ||
              target.toLowerCase().includes(cat.toLowerCase())
            );
            if (match) return match;
          }
        }
      }
      
      // 3. Поиск по подстроке
      const substringMatch = categoryNames.find(cat => 
        cat.toLowerCase().includes(sLower) || sLower.includes(cat.toLowerCase())
      );
      if (substringMatch) return substringMatch;
      
      // 4. Fallback - возвращаем оригинал или "Разное"
      return s || 'Разное';
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

      // Extended date formats
      const formats = [
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, order: 'dmy' },
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/, order: 'dmy_short' },
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'dmy' },
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, order: 'dmy_short' },
        { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: 'dmy' },
        { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})/, order: 'ymd' },
        { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, order: 'ymd' },
      ];

      for (const { regex, order } of formats) {
        const match = s.match(regex);
        if (match) {
          let year: number, month: number, day: number;
          
          if (order === 'ymd') {
            [, year, month, day] = match.map(Number);
          } else if (order === 'dmy_short') {
            [, day, month, year] = match.map(Number);
            year = year < 50 ? 2000 + year : 1900 + year;
          } else {
            [, day, month, year] = match.map(Number);
          }
          
          if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          }
        }
      }

      return null;
    };

    // Функция маппинга cash_type
    const mapCashType = (projectOwner: string): string | null => {
      if (!projectOwner) return null;
      const s = String(projectOwner).toLowerCase().trim();
      
      if (s.includes('настя') || s === 'наличка настя') return 'Наличка Настя';
      if (s.includes('лера') || s === 'наличка лера') return 'Наличка Лера';
      if (s.includes('ваня') || s === 'наличка ваня') return 'Наличка Ваня';
      
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
        const category = findMatchingCategory(row.category || '');

        // Если есть и доход и расход - создаём две транзакции
        if (expenseAmount > 0 && incomeAmount > 0) {
          validRows.push({
            created_by: user_id,
            operation_date: operationDate,
            static_project_name: row.project_name || null,
            project_owner: projectOwner,
            description: description,
            category: category,
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
            category: category,
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
            category: category,
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
        console.warn(`Row ${i + 1} failed:`, error.message, row);
      }
    }

    console.log(`Prepared ${validRows.length} valid rows for insertion`);

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
        console.log(`Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} rows`);
      }
    }

    console.log(`Import complete: ${result.inserted} inserted, ${result.failed} failed`);

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
