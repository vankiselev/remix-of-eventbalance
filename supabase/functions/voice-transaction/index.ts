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
  cash_type: string;
  project_name?: string;
}

const PROJECT_OWNERS = [
  'Наличка Настя', 'Наличка Лера', 'Наличка Ваня',
  'Корп. карта Настя', 'Корп. карта Лера', 'Корп. карта Ваня',
  'ИП Настя', 'ИП Лера', 'ИП Ваня',
  'ООО Настя', 'ООО Лера', 'ООО Ваня',
  'Своя Лера', 'Своя Настя', 'Своя Ваня'
];

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, apiKey } = await req.json();
    
    if (!text || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Text and API key are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[voice-transaction] Processing text:', text);

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

    // Get user profile for default cash_type
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[voice-transaction] Error fetching profile:', profileError);
    }

    // Use Lovable AI to extract transaction details
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Ты помощник для извлечения деталей финансовых транзакций из голосовых команд на русском языке.
Извлеки следующую информацию:
- amount (число, обязательно): сумма в рублях
- description (строка, обязательно): краткое описание транзакции
- type (строка, обязательно): "expense" для расходов или "income" для доходов
- category (строка, обязательно): выбери НАИБОЛЕЕ подходящую категорию из списка:
  ${EXPENSE_INCOME_CATEGORIES.map(c => `  * "${c}"`).join('\n')}
- cash_type (строка, обязательно): выбери из списка владельцев проектов:
  ${PROJECT_OWNERS.map(o => `  * "${o}"`).join('\n')}
- project_name (строка, опционально): название проекта или его префикс (например: "0111", "0101 саманта", "День рождения")

ВАЖНО:
- Распознавай вариации названий (например "наличка настя", "наличные Настя" → "Наличка Настя")
- Если категория не указана явно, определи её из описания (например: "такси" → "Доставка / Трансфер / Парковка / Вывоз мусора")
- Если владелец не указан, используй "Наличка Настя"
- Если сказано "проект" + название, извлеки название проекта

ОБЯЗАТЕЛЬНО верни ВАЛИДНЫЙ JSON объект с этими полями. Не добавляй никаких комментариев или пояснений, только JSON.

Примеры:
"добавь расход 200 рублей Такси до офиса наличка настя проект 0101 саманта" → {"amount": 200, "description": "Такси до офиса", "type": "expense", "category": "Доставка / Трансфер / Парковка / Вывоз мусора", "cash_type": "Наличка Настя", "project_name": "0101 саманта"}
"трата 500 такси проект 0111" → {"amount": 500, "description": "Такси", "type": "expense", "category": "Доставка / Трансфер / Парковка / Вывоз мусора", "cash_type": "Наличка Настя", "project_name": "0111"}
"расход 1500 аниматоры корп карта лера" → {"amount": 1500, "description": "Аниматоры", "type": "expense", "category": "Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)", "cash_type": "Корп. карта Лера"}
"приход 5000 за мероприятие" → {"amount": 5000, "description": "Оплата за мероприятие", "type": "income", "category": "Прибыль/доход", "cash_type": "Наличка Настя"}`
          },
          {
            role: 'user',
            content: text
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[voice-transaction] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.', success: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('[voice-transaction] AI response:', aiContent);

    // Parse AI response
    let transactionDetails: TransactionDetails;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      transactionDetails = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[voice-transaction] Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Could not understand the transaction details. Please try again with more specific information.', 
          success: false,
          aiResponse: aiContent
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate extracted data
    if (!transactionDetails.amount || !transactionDetails.description || !transactionDetails.type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required transaction details. Please specify amount, description, and type (income/expense).', 
          success: false,
          extracted: transactionDetails
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize cash_type and category
    transactionDetails.cash_type = normalizeCashType(transactionDetails.cash_type || 'Наличка Настя');
    transactionDetails.category = normalizeCategory(transactionDetails.category || 'Прочие расходы');

    console.log('[voice-transaction] Normalized details:', transactionDetails);

    // Search for project/event if project_name is provided
    let projectId: string | null = null;
    let projectName: string | null = null;
    
    if (transactionDetails.project_name) {
      const searchTerm = transactionDetails.project_name.toLowerCase().trim();
      
      console.log('[voice-transaction] Searching for project:', searchTerm);
      
      // Search for events matching the project name
      const { data: matchingEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_date')
        .or(`name.ilike.${searchTerm}%,name.ilike.% ${searchTerm}%`)
        .order('start_date', { ascending: false })
        .limit(10);
      
      if (eventsError) {
        console.error('[voice-transaction] Error searching events:', eventsError);
      } else if (matchingEvents && matchingEvents.length > 0) {
        console.log('[voice-transaction] Found matching events:', matchingEvents.length);
        
        // Check for exact match
        const exactMatch = matchingEvents.find(e => 
          e.name.toLowerCase() === searchTerm
        );
        
        if (exactMatch) {
          projectId = exactMatch.id;
          projectName = exactMatch.name;
          console.log('[voice-transaction] Exact match found:', projectName);
        } else if (matchingEvents.length === 1) {
          // If only one match, use it
          projectId = matchingEvents[0].id;
          projectName = matchingEvents[0].name;
          console.log('[voice-transaction] Single match found:', projectName);
        } else {
          // Multiple matches - return for user selection
          console.log('[voice-transaction] Multiple matches found, returning for selection');
          return new Response(
            JSON.stringify({
              success: false,
              needsProjectSelection: true,
              message: `Найдено несколько проектов с "${transactionDetails.project_name}"`,
              matchingProjects: matchingEvents.map(e => ({
                id: e.id,
                name: e.name,
                date: e.start_date
              })),
              transactionDetails: transactionDetails
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log('[voice-transaction] No matching events found, using static project name');
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
      requires_verification: true,
      verification_status: 'pending'
    };

    // Set project reference
    if (projectId) {
      transactionData.project_id = projectId;
      transactionData.static_project_name = null;
    } else if (transactionDetails.project_name) {
      transactionData.project_id = null;
      transactionData.static_project_name = transactionDetails.project_name;
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

    // Build response message
    let responseMessage = transactionDetails.type === 'expense'
      ? `✅ Готово! Расход ${transactionDetails.amount}₽ - ${transactionDetails.description}`
      : `✅ Готово! Приход ${transactionDetails.amount}₽ - ${transactionDetails.description}`;

    if (projectName) {
      responseMessage += `\nПроект: ${projectName}`;
    } else if (transactionDetails.project_name) {
      responseMessage += `\nПроект: ${transactionDetails.project_name}`;
    }

    responseMessage += `\nКатегория: ${transactionDetails.category}`;
    responseMessage += `\nВладелец: ${transactionDetails.cash_type}`;
    responseMessage += `\n\nЧек можно добавить позже в приложении.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        transaction: {
          id: transaction.id,
          amount: transactionDetails.amount,
          description: transactionDetails.description,
          type: transactionDetails.type,
          category: transactionDetails.category,
          cash_type: transactionDetails.cash_type,
          project_id: projectId,
          project_name: projectName || transactionDetails.project_name,
          date: transactionData.operation_date
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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
