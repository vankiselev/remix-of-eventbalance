import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface TransactionDetails {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category: string;
  cash_type?: string;
  project_name?: string;
}

interface Step1Data {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  suggestedCategory: string;
}

interface ProjectMatch {
  id: string;
  name: string;
  date: string;
  confidence: number;
}

const PROJECT_OWNERS = [
  'Наличка Настя', 'Наличка Лера', 'Наличка Ваня',
  'Корп. карта Настя', 'Корп. карта Лера', 'Корп. карта Ваня',
  'ИП Настя', 'ИП Лера', 'ИП Ваня',
  'ООО Настя', 'ООО Лера', 'ООО Ваня',
  'Своя Лера', 'Своя Настя', 'Своя Ваня'
];

// Extended wallet synonyms for voice normalization
const WALLET_SYNONYMS: Record<string, string> = {
  // Наличка
  'наличка настя': 'Наличка Настя',
  'наличные настя': 'Наличка Настя',
  'кэш настя': 'Наличка Настя',
  'нал настя': 'Наличка Настя',
  'наличка лера': 'Наличка Лера',
  'наличные лера': 'Наличка Лера',
  'кэш лера': 'Наличка Лера',
  'нал лера': 'Наличка Лера',
  'наличка ваня': 'Наличка Ваня',
  'наличные ваня': 'Наличка Ваня',
  'кэш ваня': 'Наличка Ваня',
  'нал ваня': 'Наличка Ваня',
  // Корп. карта
  'корп карта настя': 'Корп. карта Настя',
  'корпоративная настя': 'Корп. карта Настя',
  'карта настя': 'Корп. карта Настя',
  'корпоративная карта настя': 'Корп. карта Настя',
  'корп карта лера': 'Корп. карта Лера',
  'корпоративная лера': 'Корп. карта Лера',
  'карта лера': 'Корп. карта Лера',
  'корпоративная карта лера': 'Корп. карта Лера',
  'корп карта ваня': 'Корп. карта Ваня',
  'корпоративная ваня': 'Корп. карта Ваня',
  'карта ваня': 'Корп. карта Ваня',
  'корпоративная карта ваня': 'Корп. карта Ваня',
  // ИП
  'ип настя': 'ИП Настя',
  'ип лера': 'ИП Лера',
  'ип ваня': 'ИП Ваня',
  // ООО
  'ооо настя': 'ООО Настя',
  'компания настя': 'ООО Настя',
  'ооо лера': 'ООО Лера',
  'компания лера': 'ООО Лера',
  'ооо ваня': 'ООО Ваня',
  'компания ваня': 'ООО Ваня',
  // Своя
  'своя настя': 'Своя Настя',
  'личная настя': 'Своя Настя',
  'свои настя': 'Своя Настя',
  'своя лера': 'Своя Лера',
  'личная лера': 'Своя Лера',
  'свои лера': 'Своя Лера',
  'своя ваня': 'Своя Ваня',
  'личная ваня': 'Своя Ваня',
  'свои ваня': 'Своя Ваня',
};

const EXPENSE_INCOME_CATEGORIES = [
  'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
  'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
  'Доставка / Трансфер / Парковка / Вывоз мусора',
  'Костюмы',
  'Локация',
  'Оборудование / Аренда снаряжения',
  'Оформление',
  'Печать',
  'Реквизит',
  'Ростовые',
  'Сладкий стол',
  'Фотограф / Видеограф',
  'Прочие специалисты',
  'Продукты',
  'Закупки (бытовая химия, упаковка, канцтовары, инвентарь для склада)',
  'ЗП',
  'Склад/Офис (аренда, коммуналка, техника)',
  'Реклама',
  'Образцы',
  'Прочие расходы',
  'Депозит',
  'Прибыль/доход',
  'Личные расходы',
  'Передано или получено от сотрудника',
  'Получено с карты'
];

function normalizeCashType(input: string): string {
  const normalized = input.toLowerCase().trim();
  
  // Check synonyms first
  if (WALLET_SYNONYMS[normalized]) {
    return WALLET_SYNONYMS[normalized];
  }
  
  // Check partial matches in synonyms
  for (const [synonym, wallet] of Object.entries(WALLET_SYNONYMS)) {
    if (normalized.includes(synonym) || synonym.includes(normalized)) {
      return wallet;
    }
  }
  
  // Check original project owners
  for (const owner of PROJECT_OWNERS) {
    if (owner.toLowerCase().includes(normalized) || 
        normalized.includes(owner.toLowerCase())) {
      return owner;
    }
  }
  
  return 'Наличка Настя';
}

function normalizeCategory(input: string): string {
  const normalized = input.toLowerCase().trim();
  
  // Прямое совпадение
  for (const category of EXPENSE_INCOME_CATEGORIES) {
    if (category.toLowerCase() === normalized) {
      return category;
    }
  }
  
  // Частичное совпадение
  for (const category of EXPENSE_INCOME_CATEGORIES) {
    if (category.toLowerCase().includes(normalized) || 
        normalized.includes(category.toLowerCase())) {
      return category;
    }
  }
  
  // Маппинг ключевых слов
  const keywordMap: Record<string, string> = {
    'такси': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'трансфер': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'доставка': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'парковка': 'Доставка / Трансфер / Парковка / Вывоз мусора',
    'зарплата': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'оклад': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'бонус': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'чаевые': 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    'аниматор': 'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
    'шоу': 'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
    'фото': 'Фотограф / Видеограф',
    'видео': 'Фотограф / Видеограф',
    'костюм': 'Костюмы',
    'реквизит': 'Реквизит',
    'оформление': 'Оформление',
    'продукты': 'Продукты',
    'еда': 'Продукты',
    'закупки': 'Закупки (бытовая химия, упаковка, канцтовары, инвентарь для склада)',
    'реклама': 'Реклама',
    'офис': 'Склад/Офис (аренда, коммуналка, техника)',
    'склад': 'Склад/Офис (аренда, коммуналка, техника)',
    'аренда': 'Склад/Офис (аренда, коммуналка, техника)',
  };
  
  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }
  
  return 'Прочие расходы';
}

// Check if user wants to skip project
function isSkipProject(text: string): boolean {
  const skipPhrases = [
    'без проекта', 'нет проекта', 'пропустить', 'пропуск',
    'не знаю', 'неизвестно', 'нет', 'без', 'пусто'
  ];
  const normalized = text.toLowerCase().trim();
  return skipPhrases.some(phrase => normalized.includes(phrase));
}

// Helper function to call Google AI API
async function callGoogleAI(systemPrompt: string, userPrompt: string): Promise<{ success: boolean; content?: string; error?: string; status?: number }> {
  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!GOOGLE_AI_API_KEY) {
    return { success: false, error: 'GOOGLE_AI_API_KEY is not configured', status: 500 };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[voice-transaction] Google AI API error:', response.status, errorText);
    return { success: false, error: errorText, status: response.status };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    return { success: false, error: 'No response from AI' };
  }

  return { success: true, content };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, apiKey, step, step1Data, projectId, cashType, mode } = body;
    
    // Validate API key
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[voice-transaction] Processing:', mode === 'simple' ? 'simple mode' : `step ${step || 'legacy'}`, 'text:', text);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key and get user_id
    const { data: userId, error: validateError } = await supabase.rpc('validate_api_key', {
      p_api_key: apiKey
    });

    if (validateError || !userId) {
      console.error('[voice-transaction] Invalid API key:', validateError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[voice-transaction] Authenticated user:', userId);

    // ============================================
    // SIMPLE MODE: One-step transaction creation
    // ============================================
    if (mode === 'simple') {
      // Get user's voice settings for defaults
      const { data: voiceSettings } = await supabase
        .from('user_voice_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const defaultWallet = cashType || voiceSettings?.default_wallet || 'Наличка Настя';

      // If step 3 with step1Data - create transaction directly
      if (step === 3 || step === '3') {
        if (!step1Data) {
          return new Response(
            JSON.stringify({ error: 'step1Data is required for step 3', success: false }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const normalizedCashType = normalizeCashType(defaultWallet);
        const normalizedCategory = normalizeCategory(step1Data.suggestedCategory || 'Прочие расходы');

        const transactionData: any = {
          created_by: userId,
          operation_date: new Date().toISOString().split('T')[0],
          income_amount: step1Data.type === 'income' ? step1Data.amount : 0,
          expense_amount: step1Data.type === 'expense' ? step1Data.amount : 0,
          category: normalizedCategory,
          cash_type: normalizedCashType,
          description: step1Data.description,
          project_owner: normalizedCashType,
          no_receipt: true,
          no_receipt_reason: 'Транзакция создана через голосовой ввод Siri',
          is_draft: true,
          requires_verification: false,
          verification_status: null,
          project_id: voiceSettings?.default_project_id || null,
          static_project_name: voiceSettings?.default_project_id ? null : 'Расходы вне проекта'
        };

        const { data: transaction, error: transactionError } = await supabase
          .from('financial_transactions')
          .insert(transactionData)
          .select()
          .single();

        if (transactionError) {
          console.error('[voice-transaction] Simple mode error:', transactionError);
          throw transactionError;
        }

        const typeLabel = step1Data.type === 'expense' ? 'Расход' : 'Приход';
        return new Response(
          JSON.stringify({
            success: true,
            step: 3,
            message: `✅ Черновик создан: ${typeLabel} ${step1Data.amount}₽ — ${step1Data.description}`,
            transaction: {
              id: transaction.id,
              amount: step1Data.amount,
              description: step1Data.description,
              type: step1Data.type,
              category: normalizedCategory,
              cash_type: normalizedCashType,
              is_draft: true
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 1: Parse text only (for web widget preview)
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Text is required', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use AI to parse the text
      const systemPrompt = `Извлеки детали транзакции из текста на русском. Верни JSON:
- amount (число): сумма в рублях
- description (строка): краткое описание (1-3 слова)
- type: "expense" или "income"
- suggestedCategory: категория из списка:
  ${EXPENSE_INCOME_CATEGORIES.slice(0, 15).join(', ')}

Примеры:
"такси 500" → {"amount":500,"description":"Такси","type":"expense","suggestedCategory":"Доставка / Трансфер / Парковка / Вывоз мусора"}
"приход 10000 за праздник" → {"amount":10000,"description":"Оплата за праздник","type":"income","suggestedCategory":"Прибыль/доход"}`;

      const aiResult = await callGoogleAI(systemPrompt, text);

      if (!aiResult.success) {
        if (aiResult.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Слишком много запросов. Попробуйте позже.', success: false }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(aiResult.error || 'AI error');
      }

      let parsedData: any;
      try {
        const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON');
        parsedData = JSON.parse(jsonMatch[0]);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Не удалось распознать. Попробуйте иначе.', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!parsedData.amount && !parsedData.description) {
        return new Response(
          JSON.stringify({ error: 'Не удалось распознать сумму и описание. Попробуйте сказать, например: "Такси 500 рублей"', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!parsedData.amount) {
        return new Response(
          JSON.stringify({ 
            error: `Не указана сумма. Добавьте сумму, например: "${parsedData.description} 500 рублей"`, 
            success: false,
            partialData: { description: parsedData.description }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!parsedData.description) {
        return new Response(
          JSON.stringify({ 
            error: `Не указано описание. Добавьте описание, например: "Такси ${parsedData.amount} рублей"`, 
            success: false,
            partialData: { amount: parsedData.amount }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      parsedData.suggestedCategory = normalizeCategory(parsedData.suggestedCategory || 'Прочие расходы');

      // If auto_create_draft is enabled, create transaction immediately
      if (voiceSettings?.auto_create_draft && !step) {
        const normalizedCashType = normalizeCashType(defaultWallet);
        
        const transactionData: any = {
          created_by: userId,
          operation_date: new Date().toISOString().split('T')[0],
          income_amount: parsedData.type === 'income' ? parsedData.amount : 0,
          expense_amount: parsedData.type === 'expense' ? parsedData.amount : 0,
          category: parsedData.suggestedCategory,
          cash_type: normalizedCashType,
          description: parsedData.description,
          project_owner: normalizedCashType,
          no_receipt: true,
          no_receipt_reason: 'Транзакция создана через голосовой ввод Siri',
          is_draft: true,
          requires_verification: false,
          verification_status: null,
          project_id: voiceSettings?.default_project_id || null,
          static_project_name: voiceSettings?.default_project_id ? null : 'Расходы вне проекта'
        };

        const { data: transaction, error: transactionError } = await supabase
          .from('financial_transactions')
          .insert(transactionData)
          .select()
          .single();

        if (transactionError) throw transactionError;

        const typeLabel = parsedData.type === 'expense' ? 'Расход' : 'Приход';
        return new Response(
          JSON.stringify({
            success: true,
            autoCreated: true,
            message: `✅ ${typeLabel} ${parsedData.amount}₽ — ${parsedData.description}`,
            transaction: {
              id: transaction.id,
              amount: parsedData.amount,
              description: parsedData.description,
              type: parsedData.type,
              category: parsedData.suggestedCategory,
              cash_type: normalizedCashType,
              is_draft: true
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return parsed data for preview
      return new Response(
        JSON.stringify({
          success: true,
          step: 1,
          step1Data: parsedData,
          defaultWallet,
          message: `${parsedData.type === 'expense' ? 'Расход' : 'Приход'} ${parsedData.amount}₽ — ${parsedData.description}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 1: Parse description and amount
    // ============================================
    if (step === 1 || step === '1') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Text is required for step 1', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const systemPrompt = `Ты помощник для извлечения деталей финансовых транзакций из голосовых команд на русском языке.
Извлеки следующую информацию:
- amount (число, обязательно): сумма в рублях
- description (строка, обязательно): краткое описание транзакции (1-3 слова)
- type (строка, обязательно): "expense" для расходов или "income" для доходов
- suggestedCategory (строка, обязательно): выбери НАИБОЛЕЕ подходящую категорию из списка:
  ${EXPENSE_INCOME_CATEGORIES.map(c => `  * "${c}"`).join('\n')}

ВАЖНО:
- Если категория не указана явно, определи её из описания (например: "такси" → "Доставка / Трансфер / Парковка / Вывоз мусора")
- Описание должно быть кратким и информативным
- Игнорируй указания кошелька и проекта - они будут запрошены отдельно

ОБЯЗАТЕЛЬНО верни ВАЛИДНЫЙ JSON объект с этими полями. Не добавляй никаких комментариев или пояснений, только JSON.

Примеры:
"добавь расход 200 рублей такси до офиса" → {"amount": 200, "description": "Такси до офиса", "type": "expense", "suggestedCategory": "Доставка / Трансфер / Парковка / Вывоз мусора"}
"трата 500 такси" → {"amount": 500, "description": "Такси", "type": "expense", "suggestedCategory": "Доставка / Трансфер / Парковка / Вывоз мусора"}
"расход 1500 аниматоры" → {"amount": 1500, "description": "Аниматоры", "type": "expense", "suggestedCategory": "Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)"}
"приход 5000 за мероприятие" → {"amount": 5000, "description": "Оплата за мероприятие", "type": "income", "suggestedCategory": "Прибыль/доход"}`;

      const aiResult = await callGoogleAI(systemPrompt, text);

      if (!aiResult.success) {
        console.error('[voice-transaction] AI error:', aiResult.status, aiResult.error);
        
        if (aiResult.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Слишком много запросов. Попробуйте позже.', success: false }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`AI error: ${aiResult.error}`);
      }

      console.log('[voice-transaction] Step 1 AI response:', aiResult.content);

      let parsedData: Step1Data;
      try {
        const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[voice-transaction] Failed to parse AI response:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Не удалось распознать транзакцию. Попробуйте сказать иначе.', 
            success: false 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!parsedData.amount || !parsedData.description || !parsedData.type) {
        return new Response(
          JSON.stringify({ 
            error: 'Укажите сумму и описание транзакции.', 
            success: false 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize category
      parsedData.suggestedCategory = normalizeCategory(parsedData.suggestedCategory || 'Прочие расходы');

      const typeLabel = parsedData.type === 'expense' ? 'Расход' : 'Приход';
      const message = `💰 ${typeLabel} ${parsedData.amount}₽ — ${parsedData.description}\n\nКакой проект? (или скажите "без проекта")`;

      return new Response(
        JSON.stringify({
          success: true,
          step: 1,
          step1Data: parsedData,
          message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 2: Search for project with fuzzy matching
    // ============================================
    if (step === 2 || step === '2') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Text is required for step 2', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user wants to skip project
      if (isSkipProject(text)) {
        const message = `📁 Без проекта\n\nКакой кошелёк?\n\nПримеры: Наличка Настя, Корп карта Лера, ИП Настя, ООО Лера, Своя Ваня`;
        
        return new Response(
          JSON.stringify({
            success: true,
            step: 2,
            projectMatch: null,
            skipProject: true,
            message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use AI to normalize project name and find best match
      const systemPrompt = `Ты помощник для нормализации названий проектов.
Пользователь называет проект голосом. Извлеки ключевые слова для поиска.

Верни JSON:
- searchTerms: массив строк для поиска (номер проекта, имя, ключевые слова)
- normalized: нормализованная строка для поиска

Примеры:
"саманта" → {"searchTerms": ["саманта"], "normalized": "саманта"}
"0101 саманта" → {"searchTerms": ["0101", "саманта"], "normalized": "0101 саманта"}
"день рождения у Маши" → {"searchTerms": ["день рождения", "маша", "маши"], "normalized": "день рождения маша"}
"корпоратив в офисе" → {"searchTerms": ["корпоратив", "офис"], "normalized": "корпоратив офис"}`;

      const aiResult = await callGoogleAI(systemPrompt, text);

      let searchTerms: string[] = [text.toLowerCase().trim()];
      
      if (!aiResult.success) {
        console.error('[voice-transaction] AI error in step 2, using fallback');
        // Fallback to direct search
        const searchTerm = text.toLowerCase().trim();
        
        const { data: events } = await supabase
          .from('events')
          .select('id, name, start_date')
          .or(`name.ilike.%${searchTerm}%`)
          .order('start_date', { ascending: false })
          .limit(5);

        if (events && events.length > 0) {
          const message = `📁 Проект: ${events[0].name}\n\nКакой кошелёк?\n\nПримеры: Наличка Настя, Корп карта Лера, ИП Настя`;
          
          return new Response(
            JSON.stringify({
              success: true,
              step: 2,
              projectMatch: { id: events[0].id, name: events[0].name, date: events[0].start_date, confidence: 0.7 },
              message
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        try {
          if (aiResult.content) {
            const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.searchTerms) searchTerms = parsed.searchTerms;
            }
          }
        } catch (e) {
          console.log('[voice-transaction] Using fallback search terms');
        }
      }

      console.log('[voice-transaction] Search terms:', searchTerms);

      // Search for events
      let allEvents: any[] = [];
      for (const term of searchTerms) {
        const { data: events } = await supabase
          .from('events')
          .select('id, name, start_date')
          .ilike('name', `%${term}%`)
          .order('start_date', { ascending: false })
          .limit(10);
        
        if (events) {
          allEvents.push(...events);
        }
      }

      // Deduplicate and rank by match quality
      const uniqueEvents = new Map<string, any>();
      for (const event of allEvents) {
        if (!uniqueEvents.has(event.id)) {
          // Calculate match score
          let score = 0;
          const nameLower = event.name.toLowerCase();
          for (const term of searchTerms) {
            if (nameLower.includes(term.toLowerCase())) score += 1;
            if (nameLower.startsWith(term.toLowerCase())) score += 0.5;
          }
          uniqueEvents.set(event.id, { ...event, score });
        } else {
          // Increase score for multiple matches
          const existing = uniqueEvents.get(event.id);
          existing.score += 0.5;
        }
      }

      const rankedEvents = Array.from(uniqueEvents.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (rankedEvents.length === 0) {
        // No matches found - save as static project name
        const message = `📁 Проект не найден. Сохраню как: "${text}"\n\nКакой кошелёк?\n\nПримеры: Наличка Настя, Корп карта Лера, ИП Настя`;
        
        return new Response(
          JSON.stringify({
            success: true,
            step: 2,
            projectMatch: null,
            staticProjectName: text,
            message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bestMatch = rankedEvents[0];
      const confidence = Math.min(bestMatch.score / searchTerms.length, 1);

      const message = `📁 Проект: ${bestMatch.name}\n\nКакой кошелёк?\n\nПримеры: Наличка Настя, Корп карта Лера, ИП Настя, ООО Лера, Своя Ваня`;

      return new Response(
        JSON.stringify({
          success: true,
          step: 2,
          projectMatch: {
            id: bestMatch.id,
            name: bestMatch.name,
            date: bestMatch.start_date,
            confidence
          },
          alternatives: rankedEvents.slice(1).map(e => ({ id: e.id, name: e.name, date: e.start_date })),
          message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 3: Create transaction with all data
    // ============================================
    if (step === 3 || step === '3') {
      if (!step1Data || !cashType) {
        return new Response(
          JSON.stringify({ error: 'step1Data and cashType are required for step 3', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize cash type
      const normalizedCashType = normalizeCashType(cashType);
      const normalizedCategory = normalizeCategory(step1Data.suggestedCategory || 'Прочие расходы');

      console.log('[voice-transaction] Step 3 - Creating transaction:', {
        ...step1Data,
        cashType: normalizedCashType,
        projectId
      });

      // Create transaction
      const transactionData: any = {
        created_by: userId,
        operation_date: new Date().toISOString().split('T')[0],
        income_amount: step1Data.type === 'income' ? step1Data.amount : 0,
        expense_amount: step1Data.type === 'expense' ? step1Data.amount : 0,
        category: normalizedCategory,
        cash_type: normalizedCashType,
        description: step1Data.description,
        project_owner: normalizedCashType,
        no_receipt: true,
        no_receipt_reason: 'Транзакция создана через голосовой ввод Siri',
        is_draft: true,
        requires_verification: false,
        verification_status: null
      };

      // Set project reference
      if (projectId) {
        transactionData.project_id = projectId;
        transactionData.static_project_name = null;
      } else if (body.staticProjectName) {
        transactionData.project_id = null;
        transactionData.static_project_name = body.staticProjectName;
      } else {
        transactionData.project_id = null;
        transactionData.static_project_name = 'Расходы вне проекта';
      }

      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        console.error('[voice-transaction] Error creating transaction:', transactionError);
        throw transactionError;
      }

      console.log('[voice-transaction] Transaction created:', transaction.id);

      // Get project name for response
      let projectName = body.staticProjectName || 'Без проекта';
      if (projectId) {
        const { data: event } = await supabase
          .from('events')
          .select('name')
          .eq('id', projectId)
          .single();
        if (event) projectName = event.name;
      }

      const typeLabel = step1Data.type === 'expense' ? 'Расход' : 'Приход';
      const message = `✅ Готово!\n\n${typeLabel} ${step1Data.amount}₽\n${step1Data.description}\nПроект: ${projectName}\nКошелёк: ${normalizedCashType}\n\nЧек можно добавить в приложении.`;

      return new Response(
        JSON.stringify({
          success: true,
          step: 3,
          message,
          transaction: {
            id: transaction.id,
            amount: step1Data.amount,
            description: step1Data.description,
            type: step1Data.type,
            category: normalizedCategory,
            cash_type: normalizedCashType,
            project_id: projectId || null,
            project_name: projectName,
            date: transactionData.operation_date
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // LEGACY MODE: Single command (backward compatibility)
    // ============================================
    if (!step && text) {
      console.log('[voice-transaction] Legacy mode - single command');
      
      // Get user profile for default cash_type
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const systemPrompt = `Ты помощник для извлечения деталей финансовых транзакций из голосовых команд на русском языке.
Извлеки следующую информацию:
- amount (число, обязательно): сумма в рублях
- description (строка, обязательно): краткое описание транзакции
- type (строка, обязательно): "expense" для расходов или "income" для доходов
- category (строка, обязательно): выбери НАИБОЛЕЕ подходящую категорию из списка:
  ${EXPENSE_INCOME_CATEGORIES.map(c => `  * "${c}"`).join('\n')}
- cash_type (строка, обязательно): выбери из списка владельцев проектов:
  ${PROJECT_OWNERS.map(o => `  * "${o}"`).join('\n')}
- project_name (строка, опционально): название проекта или его префикс (например: "0111", "0101 саманта", "День рождения")

ОБЯЗАТЕЛЬНО верни ВАЛИДНЫЙ JSON объект с этими полями. Не добавляй никаких комментариев или пояснений, только JSON.`;

      const aiResult = await callGoogleAI(systemPrompt, text);

      if (!aiResult.success) {
        console.error('[voice-transaction] AI error:', aiResult.status, aiResult.error);
        throw new Error(`AI error: ${aiResult.error}`);
      }

      let transactionDetails: TransactionDetails;
      try {
        const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        transactionDetails = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        return new Response(
          JSON.stringify({ 
            error: 'Could not understand the transaction details. Please try again.', 
            success: false 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!transactionDetails.amount || !transactionDetails.description || !transactionDetails.type) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required transaction details.', 
            success: false 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      transactionDetails.cash_type = normalizeCashType(transactionDetails.cash_type || 'Наличка Настя');
      transactionDetails.category = normalizeCategory(transactionDetails.category || 'Прочие расходы');

      // Search for project
      let projectIdLegacy: string | null = null;
      let projectNameLegacy: string | null = null;
      
      if (transactionDetails.project_name) {
        const searchTerm = transactionDetails.project_name.toLowerCase().trim();
        const { data: matchingEvents } = await supabase
          .from('events')
          .select('id, name, start_date')
          .or(`name.ilike.${searchTerm}%,name.ilike.% ${searchTerm}%`)
          .order('start_date', { ascending: false })
          .limit(5);
        
        if (matchingEvents && matchingEvents.length > 0) {
          projectIdLegacy = matchingEvents[0].id;
          projectNameLegacy = matchingEvents[0].name;
        }
      }

      // Create transaction
      const transactionData: any = {
        created_by: userId,
        operation_date: new Date().toISOString().split('T')[0],
        income_amount: transactionDetails.type === 'income' ? transactionDetails.amount : 0,
        expense_amount: transactionDetails.type === 'expense' ? transactionDetails.amount : 0,
        category: transactionDetails.category,
        cash_type: transactionDetails.cash_type,
        description: transactionDetails.description,
        project_owner: transactionDetails.cash_type,
        no_receipt: true,
        no_receipt_reason: 'Транзакция создана через голосовой ввод Siri',
        is_draft: true,
        requires_verification: false,
        verification_status: null,
        project_id: projectIdLegacy,
        static_project_name: projectIdLegacy ? null : (transactionDetails.project_name || 'Расходы вне проекта')
      };

      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      const typeLabel = transactionDetails.type === 'expense' ? 'Расход' : 'Приход';
      let message = `✅ Готово! ${typeLabel} ${transactionDetails.amount}₽ - ${transactionDetails.description}`;
      if (projectNameLegacy) {
        message += `\nПроект: ${projectNameLegacy}`;
      } else if (transactionDetails.project_name) {
        message += `\nПроект: ${transactionDetails.project_name}`;
      }
      message += `\nКатегория: ${transactionDetails.category}`;
      message += `\nВладелец: ${transactionDetails.cash_type}`;
      message += `\n\nЧек можно добавить позже в приложении.`;

      return new Response(
        JSON.stringify({
          success: true,
          message,
          transaction: {
            id: transaction.id,
            amount: transactionDetails.amount,
            description: transactionDetails.description,
            type: transactionDetails.type,
            category: transactionDetails.category,
            cash_type: transactionDetails.cash_type,
            project_id: projectIdLegacy,
            project_name: projectNameLegacy || transactionDetails.project_name,
            date: transactionData.operation_date
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Specify step (1, 2, or 3) or text for legacy mode.', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[voice-transaction] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
