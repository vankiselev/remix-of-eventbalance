import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  target_user_id?: string;
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
  skipped: number;
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

// Основная функция импорта
async function processImport(
  supabase: any,
  rows: ImportRow[],
  user_id: string,
  target_user_id: string,
  job_id: string | null,
  resume_from_row: number = 0
): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    inserted: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Обновляем статус job если есть
  const updateJobProgress = async (processed: number, inserted: number, failed: number, skipped: number) => {
    if (!job_id) return;
    try {
      await supabase
        .from('import_jobs')
        .update({
          processed_rows: processed,
          inserted_rows: inserted,
          failed_rows: failed,
          skipped_rows: skipped,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id);
    } catch (e) {
      console.warn('Failed to update job progress:', e);
    }
  };

  // Получаем список категорий из БД для fuzzy matching
  const { data: categoriesData } = await supabase
    .from('transaction_categories')
    .select('name')
    .eq('is_active', true);
  
  const categoryNames = categoriesData?.map((c: any) => c.name) || [];
  console.log(`Loaded ${categoryNames.length} categories from DB`);

  // Функция fuzzy matching для категорий
  const findMatchingCategory = (input: string): string => {
    if (!input) return 'Разное';
    
    const s = String(input).trim();
    const sLower = s.toLowerCase();
    
    const exactMatch = categoryNames.find((cat: string) => cat.toLowerCase() === sLower);
    if (exactMatch) return exactMatch;
    
    for (const [alias, targets] of Object.entries(categoryAliases)) {
      if (sLower.includes(alias) || alias.includes(sLower)) {
        for (const target of targets) {
          const match = categoryNames.find((cat: string) => 
            cat.toLowerCase().includes(target.toLowerCase()) ||
            target.toLowerCase().includes(cat.toLowerCase())
          );
          if (match) return match;
        }
      }
    }
    
    const substringMatch = categoryNames.find((cat: string) => 
      cat.toLowerCase().includes(sLower) || sLower.includes(cat.toLowerCase())
    );
    if (substringMatch) return substringMatch;
    
    return s || 'Разное';
  };

  // Функция парсинга даты
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (!s) return null;

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

  // Полный список типов кошельков
  const WALLET_TYPES = [
    'Наличка Настя',
    'Наличка Лера', 
    'Наличка Ваня',
    'Корп. карта Настя',
    'Корп. карта Лера',
    'ИП Настя',
    'ИП Лера',
    'Оплатил(а) клиент',
    'Оплатила Настя',
    'Оплатила Лера',
    'Получила Лера',
    'Получила Настя'
  ];

  // Функция маппинга cash_type
  const mapCashType = (projectOwner: string): string | null => {
    if (!projectOwner) return null;
    const input = String(projectOwner).trim();
    const inputLower = input.toLowerCase();
    
    // 1. Точное совпадение
    const exactMatch = WALLET_TYPES.find(w => w.toLowerCase() === inputLower);
    if (exactMatch) return exactMatch;
    
    // 2. Частичное совпадение (input содержится в названии или наоборот)
    const partialMatch = WALLET_TYPES.find(w => 
      w.toLowerCase().includes(inputLower) || 
      inputLower.includes(w.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // 3. Синонимы и сокращения
    if (inputLower.includes('корп') && inputLower.includes('настя')) return 'Корп. карта Настя';
    if (inputLower.includes('корп') && inputLower.includes('лера')) return 'Корп. карта Лера';
    if (inputLower.includes('карта') && inputLower.includes('настя')) return 'Корп. карта Настя';
    if (inputLower.includes('карта') && inputLower.includes('лера')) return 'Корп. карта Лера';
    if (inputLower.includes('ип') && inputLower.includes('настя')) return 'ИП Настя';
    if (inputLower.includes('ип') && inputLower.includes('лера')) return 'ИП Лера';
    if (inputLower.includes('клиент')) return 'Оплатил(а) клиент';
    if (inputLower.includes('оплатил') && inputLower.includes('настя')) return 'Оплатила Настя';
    if (inputLower.includes('оплатил') && inputLower.includes('лера')) return 'Оплатила Лера';
    if (inputLower.includes('получил') && inputLower.includes('настя')) return 'Получила Настя';
    if (inputLower.includes('получил') && inputLower.includes('лера')) return 'Получила Лера';
    if (inputLower.includes('наличк') && inputLower.includes('настя')) return 'Наличка Настя';
    if (inputLower.includes('наличк') && inputLower.includes('лера')) return 'Наличка Лера';
    if (inputLower.includes('наличк') && inputLower.includes('ваня')) return 'Наличка Ваня';
    
    // 4. Если ничего не подошло - возвращаем как есть
    return input;
  };

  // Подготовка данных
  const validRows: any[] = [];
  
  // Если это продолжение импорта - начинаем с нужной строки
  const startIndex = resume_from_row > 0 ? resume_from_row : 0;
  console.log(`Processing rows from index ${startIndex} to ${rows.length}`);
  
  for (let i = startIndex; i < rows.length; i++) {
    const row: ImportRow = rows[i];
    
    try {
      const operationDate = parseDate(row.operation_date);
      if (!operationDate) {
        throw new Error("Некорректная дата");
      }

      // Округляем до целых рублей - копейки не учитываем
      const expenseAmount = Math.round(row.expense_amount || 0);
      const incomeAmount = Math.round(row.income_amount || 0);

      if (expenseAmount === 0 && incomeAmount === 0) {
        throw new Error("Не указана сумма операции");
      }

      const description = row.description || (expenseAmount > 0 ? 'Расход' : 'Приход');
      const cashType = mapCashType(row.project_owner || '');
      const projectOwner = cashType || row.project_owner || 'Без кассы';
      const category = findMatchingCategory(row.category || '');

      if (expenseAmount > 0 && incomeAmount > 0) {
        validRows.push({
          created_by: target_user_id,
          operation_date: operationDate,
          static_project_name: row.project_name || null,
          project_owner: projectOwner,
          description: description,
          category: category,
          cash_type: cashType,
          expense_amount: expenseAmount,
          income_amount: null,
          notes: row.notes || null,
          verification_status: 'approved',
          requires_verification: false,
          import_row_order: i + 1  // Preserve row order from Excel
        });
        validRows.push({
          created_by: target_user_id,
          operation_date: operationDate,
          static_project_name: row.project_name || null,
          project_owner: projectOwner,
          description: description,
          category: category,
          cash_type: cashType,
          expense_amount: null,
          income_amount: incomeAmount,
          notes: row.notes || null,
          verification_status: 'approved',
          requires_verification: false,
          import_row_order: i + 1  // Preserve row order from Excel
        });
      } else {
        validRows.push({
          created_by: target_user_id,
          operation_date: operationDate,
          static_project_name: row.project_name || null,
          project_owner: projectOwner,
          description: description,
          category: category,
          cash_type: cashType,
          expense_amount: expenseAmount || null,
          income_amount: incomeAmount || null,
          notes: row.notes || null,
          verification_status: 'approved',
          requires_verification: false,
          import_row_order: i + 1  // Preserve row order from Excel
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

  // Отключаем триггер пересчёта балансов перед импортом для ускорения
  console.log('Disabling balance recalculation trigger...');
  const { error: disableError } = await supabase.rpc('disable_balances_trigger_for_import');
  if (disableError) {
    console.error('Failed to disable trigger:', disableError);
    throw new Error(`Failed to disable balance trigger: ${disableError.message}`);
  }
  console.log('Balance trigger disabled successfully');

  // Sleep функция для паузы между батчами
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Batch вставка с retry логикой и exponential backoff
  const BATCH_SIZE = 50; // Уменьшено для стабильности
  const MAX_RETRIES = 3;
  const BASE_RETRY_DELAY = 500; // Базовая задержка для exponential backoff
  const DELAY_BETWEEN_BATCHES = 150; // Увеличено для предотвращения перегрузки
  const PROGRESS_UPDATE_INTERVAL = 1000; // Минимум 1 секунда между обновлениями прогресса
  let processedRows = resume_from_row; // Начинаем с места остановки
  let batchNumber = 0;
  let lastProgressUpdate = 0; // Timestamp последнего обновления прогресса
  
  // Функция обработки одного батча с exponential backoff
  const processBatch = async (batch: any[], batchIdx: number) => {
    let success = false;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
      try {
        const { error } = await supabase
          .from('financial_transactions')
          .insert(batch);

        if (error) {
          lastError = error;
          // Если timeout или deadlock - пытаемся retry с exponential backoff
          if ((error.code === '57014' || error.code === '40P01') && attempt < MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1); // 500ms → 1000ms → 2000ms
            console.warn(`Batch ${batchIdx} ${error.code} on attempt ${attempt}, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          throw error;
        }

        success = true;
        return { success: true, count: batch.length };
      } catch (err: any) {
        lastError = err;
        if (attempt === MAX_RETRIES) {
          console.error(`Batch ${batchIdx} failed after ${MAX_RETRIES} attempts:`, err);
        }
      }
    }

    return { success: false, count: batch.length, error: lastError };
  };

  // Последовательная обработка батчей (один за раз)
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;

    batchNumber++;
    const res = await processBatch(batch, batchNumber);

    // Обрабатываем результат
    if (res.success) {
      result.inserted += res.count;
    } else {
      result.failed += res.count;
      for (let j = 0; j < res.count; j++) {
        result.errors.push({
          row: i + j + 1,
          reason: res.error?.message || 'Ошибка вставки'
        });
      }
    }

    processedRows = resume_from_row + Math.min(i + BATCH_SIZE, validRows.length);
    
    // Обновляем прогресс каждые 2 батча или если прошла 1+ секунда с последнего обновления
    const now = Date.now();
    const isLastBatch = processedRows >= rows.length;
    const shouldUpdate = isLastBatch || 
                        (batchNumber % 2 === 0 && now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL);
    
    if (shouldUpdate) {
      await updateJobProgress(processedRows, result.inserted, result.failed, result.skipped);
      lastProgressUpdate = now;
      console.log(`Progress: batch ${batchNumber}, inserted ${result.inserted}/${validRows.length} rows, total processed ${processedRows}/${rows.length}`);
    }

    // Пауза между батчами для предотвращения перегрузки БД
    if (i + BATCH_SIZE < validRows.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Включаем триггер обратно и пересчитываем все балансы
  console.log('Enabling balance recalculation trigger and recalculating balances...');
  const { error: enableError } = await supabase.rpc('enable_balances_trigger_and_recalculate');
  if (enableError) {
    console.error('Failed to enable trigger and recalculate:', enableError);
    // Не бросаем ошибку, так как импорт уже завершён успешно
    console.warn('Import succeeded but balance recalculation failed - please recalculate manually');
  } else {
    console.log('Balance trigger enabled and all balances recalculated successfully');
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // === JWT VERIFICATION: caller must be authenticated ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedUserId = claimsData.claims.sub as string;
    console.log(`Verified caller: ${verifiedUserId}`);

    // Service role client for DB operations (only after auth verified)
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { rows, target_user_id, background_mode, job_id, resume_from_row } = await req.json();
    const user_id = verifiedUserId; // Always use verified caller, ignore body user_id

    // Validate target_user_id: caller can only import for themselves or must be admin
    let resolvedTargetUserId = verifiedUserId;
    if (target_user_id && target_user_id !== verifiedUserId) {
      // Check if caller is admin
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: verifiedUserId, _role: 'admin' });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: only admins can import for other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resolvedTargetUserId = target_user_id;
      console.log(`Admin ${verifiedUserId} importing for target user ${resolvedTargetUserId}`);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: rows array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting import: ${rows.length} rows for user ${user_id}, target: ${resolvedTargetUserId}, background: ${background_mode}, job_id: ${job_id}`);

    // Если фоновый режим - запускаем в waitUntil и сразу возвращаем ответ
    if (background_mode && job_id) {
      // Обновляем статус на processing
      await supabase
        .from('import_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          total_rows: rows.length
        })
        .eq('id', job_id);

      // Запускаем обработку в фоне
      EdgeRuntime.waitUntil((async () => {
        try {
          console.log(`[Background] Starting import job ${job_id}, resume_from_row: ${resume_from_row || 0}`);
          const result = await processImport(supabase, rows, user_id, resolvedTargetUserId, job_id, resume_from_row || 0);
          
          // Обновляем финальный статус и очищаем import_data
          await supabase
            .from('import_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              processed_rows: result.total,
              inserted_rows: result.inserted,
              failed_rows: result.failed,
              skipped_rows: result.skipped,
              errors: result.errors.slice(0, 100), // Ограничиваем количество ошибок
              import_data: null, // Очищаем данные после успешного завершения
              updated_at: new Date().toISOString()
            })
            .eq('id', job_id);
          
          console.log(`[Background] Import job ${job_id} completed: ${result.inserted} inserted, ${result.failed} failed`);
        } catch (error: any) {
          console.error(`[Background] Import job ${job_id} failed:`, error);
          await supabase
            .from('import_jobs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              errors: [{ row: 0, reason: error.message || 'Unknown error' }],
              updated_at: new Date().toISOString()
            })
            .eq('id', job_id);
        }
      })());

      // Сразу возвращаем ответ
      return new Response(
        JSON.stringify({ 
          success: true, 
          job_id: job_id,
          message: 'Import started in background' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Синхронный режим - ждём завершения
    const result = await processImport(supabase, rows, user_id, target_user_id || user_id, job_id, resume_from_row || 0);
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