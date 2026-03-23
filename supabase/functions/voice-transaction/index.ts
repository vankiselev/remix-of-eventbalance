import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIProxy, extractTextContent } from "../_shared/ai-proxy-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXPENSE_INCOME_CATEGORIES = [
  'Агентская комиссия',
  'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
  'Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)',
  'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
  'Выступление артистов (диджеи, селебрити, кавер-группы)',
  'Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)',
  'Доставка / Трансфер / Парковка / Вывоз мусора',
  'Еда / Напитки (сладкий стол, торт, кейтеринг)',
  'Закупки / Оплаты (ФИН, офис, склад, компания)',
  'Залог (внесли/вернули)',
  'Комиссия за перевод',
  'Монтаж / Демонтаж',
  'Накладные расходы (райдер, траты вне сметы)',
  'Передано или получено от Леры/Насти/Вани',
  'Передано или получено от сотрудника',
  'Печать (баннеры, меню, карточки)',
  'Площадка (депозит, аренда, доп. услуги)',
  'Получено/Возвращено клиенту',
  'Производство (декорации, костюмы)',
  'Прочие специалисты',
  'Фотограф / Видеограф',
  'Налог / УСН',
];

const WALLET_TYPES = [
  'Наличка Настя', 'Наличка Лера', 'Наличка Ваня',
  'Корп. карта Настя', 'Корп. карта Лера', 'Корп. карта Ваня',
  'ИП Настя', 'ИП Лера', 'ИП Ваня',
  'ООО Настя', 'ООО Лера', 'ООО Ваня',
  'Своя Лера', 'Своя Настя', 'Своя Ваня'
];

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}

// Extract user_id from JWT
async function getUserFromJWT(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth via JWT
    const userId = await getUserFromJWT(req);
    if (!userId) {
      return errorResponse('Необходима авторизация. Войдите в приложение.', 401);
    }

    const body = await req.json();
    const { text, step, step1Data, cashType } = body;

    console.log('[voice-transaction] User:', userId, 'step:', step || 'parse', 'text:', text);

    // Initialize admin client for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP: Create transaction from parsed data
    // ============================================
    if (step === 'create') {
      if (!step1Data) {
        return errorResponse('Данные транзакции не указаны');
      }

      const transactionData = {
        created_by: userId,
        operation_date: new Date().toISOString().split('T')[0],
        income_amount: step1Data.type === 'income' ? step1Data.amount : 0,
        expense_amount: step1Data.type === 'expense' ? step1Data.amount : 0,
        category: step1Data.suggestedCategory || 'Накладные расходы (райдер, траты вне сметы)',
        cash_type: step1Data.cashType || cashType || 'Наличка Ваня',
        description: step1Data.description || '',
        project_owner: step1Data.cashType || cashType || 'Наличка Ваня',
        no_receipt: true,
        no_receipt_reason: 'Голосовой ввод',
        is_draft: true,
        requires_verification: false,
        static_project_name: 'Расходы вне проекта',
      };

      const { data: transaction, error: txError } = await adminClient
        .from('financial_transactions')
        .insert(transactionData)
        .select('id')
        .single();

      if (txError) {
        console.error('[voice-transaction] Insert error:', txError);
        return errorResponse('Не удалось создать транзакцию. Попробуйте ещё раз.');
      }

      return jsonResponse({
        success: true,
        transaction: { id: transaction.id, ...step1Data, is_draft: true },
        message: `Черновик создан: ${step1Data.type === 'expense' ? 'Расход' : 'Приход'} ${step1Data.amount}₽`,
      });
    }

    // ============================================
    // DEFAULT: Parse text into transaction data
    // ============================================
    if (!text || !text.trim()) {
      return errorResponse('Текст не указан. Скажите или введите описание транзакции.');
    }

    const systemPrompt = `Ты — парсер финансовых транзакций для event-агентства. Извлеки из текста на русском языке данные о транзакции.

Верни строго JSON (без markdown, без \`\`\`):
{
  "amount": <число, сумма в рублях>,
  "description": "<краткое описание, 1-5 слов>",
  "type": "expense" или "income",
  "suggestedCategory": "<категория из списка ниже>",
  "cashType": "<кошелёк из списка ниже или null>",
  "confidence": <число 0-100, насколько уверен в разборе>
}

Правила:
- "передал", "отдал", "перевел" + имя = это расход, категория "Передано или получено от Леры/Насти/Вани" или "Передано или получено от сотрудника"
- "получил", "приход", "получено", "оплата от клиента" = income
- "такси", "доставка" = "Доставка / Трансфер / Парковка / Вывоз мусора"
- Имена Ваня/Лера/Настя в контексте кошелька → cashType "Наличка Ваня" и т.д.
- Числа: "2.500" и "2500" и "две с половиной тысячи" = 2500
- Если не уверен в типе, ставь "expense"
- Если нет суммы, amount = 0
- confidence < 50 если данные неоднозначны

Категории: ${EXPENSE_INCOME_CATEGORIES.join('; ')}

Кошельки: ${WALLET_TYPES.join('; ')}`;

    const aiResult = await callAI(systemPrompt, text.trim());

    if (!aiResult.success) {
      if (aiResult.status === 429) {
        return errorResponse('Слишком много запросов. Подождите минуту и попробуйте снова.', 429);
      }
      return errorResponse('Сервис распознавания временно недоступен. Попробуйте позже.', 502);
    }

    let parsedData: any;
    try {
      const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      parsedData = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('[voice-transaction] Failed to parse AI response:', aiResult.content);
      return errorResponse('Не удалось разобрать фразу. Попробуйте сказать проще, например: "Такси 500 рублей"');
    }

    // Validate parsed data
    if (!parsedData.amount || parsedData.amount <= 0) {
      return jsonResponse({
        success: false,
        error: 'Не удалось определить сумму. Укажите сумму, например: "1500 рублей"',
        partialData: parsedData,
      }, 200); // 200 so client can show partial data
    }

    if (!parsedData.description) {
      parsedData.description = text.trim().substring(0, 50);
    }

    // Ensure category is from our list
    if (!EXPENSE_INCOME_CATEGORIES.includes(parsedData.suggestedCategory)) {
      parsedData.suggestedCategory = findClosestCategory(parsedData.suggestedCategory || '');
    }

    // Ensure cashType is from our list
    if (parsedData.cashType && !WALLET_TYPES.includes(parsedData.cashType)) {
      parsedData.cashType = findClosestWallet(parsedData.cashType);
    }

    return jsonResponse({
      success: true,
      amount: parsedData.amount,
      description: parsedData.description,
      type: parsedData.type || 'expense',
      suggestedCategory: parsedData.suggestedCategory,
      cashType: parsedData.cashType || null,
      confidence: parsedData.confidence || 70,
    });

  } catch (err) {
    console.error('[voice-transaction] Unhandled error:', err);
    return errorResponse('Произошла ошибка. Попробуйте ещё раз.', 500);
  }
});

// Helper function to call AI through proxy
async function callAI(systemPrompt: string, userPrompt: string): Promise<{ success: boolean; content?: string; error?: string; status?: number }> {
  try {
    const response = await callAIProxy({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const content = extractTextContent(response);
    if (!content) {
      return { success: false, error: 'No response from AI' };
    }
    return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[voice-transaction] AI error:', msg);
    if (msg.includes("Rate limit")) return { success: false, error: msg, status: 429 };
    return { success: false, error: msg, status: 500 };
  }
}

function findClosestCategory(input: string): string {
  if (!input) return 'Накладные расходы (райдер, траты вне сметы)';
  const lower = input.toLowerCase();
  
  const keywordMap: Record<string, string> = {
    'такси': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'трансфер': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'доставка': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'зарплата': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'оклад': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'аниматор': 'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
    'фото': 'Фотограф / Видеограф',
    'видео': 'Фотограф / Видеограф',
    'еда': 'Еда / Напитки (сладкий стол, торт, кейтеринг)',
    'торт': 'Еда / Напитки (сладкий стол, торт, кейтеринг)',
    'кейтеринг': 'Еда / Напитки (сладкий стол, торт, кейтеринг)',
    'передал': 'Передано или получено от Леры/Насти/Вани',
    'перевод': 'Передано или получено от сотрудника',
    'площадка': 'Площадка (депозит, аренда, доп. услуги)',
    'печать': 'Печать (баннеры, меню, карточки)',
    'оформление': 'Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)',
    'монтаж': 'Монтаж / Демонтаж',
    'клиент': 'Получено/Возвращено клиенту',
    'налог': 'Налог / УСН',
  };

  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) return category;
  }

  // Fuzzy match against real categories
  for (const cat of EXPENSE_INCOME_CATEGORIES) {
    if (cat.toLowerCase().includes(lower) || lower.includes(cat.toLowerCase().substring(0, 10))) {
      return cat;
    }
  }

  return 'Накладные расходы (райдер, траты вне сметы)';
}

function findClosestWallet(input: string): string | null {
  if (!input) return null;
  const lower = input.toLowerCase();

  const nameMap: Record<string, string> = {
    'ваня': 'Ваня', 'ваню': 'Ваня', 'ване': 'Ваня', 'вани': 'Ваня', 'иван': 'Ваня',
    'лера': 'Лера', 'леры': 'Лера', 'лере': 'Лера', 'валерия': 'Лера',
    'настя': 'Настя', 'насти': 'Настя', 'насте': 'Настя', 'анастасия': 'Настя',
  };

  let person = '';
  for (const [key, val] of Object.entries(nameMap)) {
    if (lower.includes(key)) { person = val; break; }
  }
  if (!person) return null;

  if (lower.includes('корп') || lower.includes('карт')) return `Корп. карта ${person}`;
  if (lower.includes('ип')) return `ИП ${person}`;
  if (lower.includes('ооо') || lower.includes('компани')) return `ООО ${person}`;
  if (lower.includes('сво') || lower.includes('личн')) return `Своя ${person}`;
  return `Наличка ${person}`;
}
