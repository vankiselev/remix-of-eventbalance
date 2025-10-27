import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface TransactionDetails {
  amount: number;
  description: string;
  category?: string;
  type: 'income' | 'expense';
  cash_type?: string;
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
- category (строка, опционально): категория транзакции, выбери из списка или предложи подходящую:
  * Расходы: "Транспорт", "Продукты", "Рестораны и кафе", "Развлечения", "Покупки", "Услуги", "Аренда", "Связь", "Здоровье", "Прочее"
  * Доходы: "Зарплата", "Мероприятия", "Продажи", "Другое"
- cash_type (строка, опционально): "Наличка Настя", "Наличка Лера", или "Наличка Ваня"

ОБЯЗАТЕЛЬНО верни ВАЛИДНЫЙ JSON объект с этими полями. Не добавляй никаких комментариев или пояснений, только JSON.

Примеры:
"потратил 500 рублей на такси" → {"amount": 500, "description": "Такси", "type": "expense", "category": "Транспорт"}
"приход 5000 за мероприятие" → {"amount": 5000, "description": "Оплата за мероприятие", "type": "income", "category": "Мероприятия"}
"купил продукты на тысячу" → {"amount": 1000, "description": "Продукты", "type": "expense", "category": "Продукты"}
"заправка 2500" → {"amount": 2500, "description": "Заправка", "type": "expense", "category": "Транспорт"}`
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

    // Set default cash_type if not provided
    if (!transactionDetails.cash_type) {
      transactionDetails.cash_type = 'Наличка Настя'; // Default
    }

    // Create transaction
    const transactionData = {
      created_by: userId,
      operation_date: new Date().toISOString().split('T')[0],
      income_amount: transactionDetails.type === 'income' ? transactionDetails.amount : 0,
      expense_amount: transactionDetails.type === 'expense' ? transactionDetails.amount : 0,
      category: transactionDetails.category || (transactionDetails.type === 'expense' ? 'Прочее' : 'Другое'),
      cash_type: transactionDetails.cash_type,
      description: transactionDetails.description,
      project_owner: transactionDetails.cash_type,
      static_project_name: 'Siri Voice Input',
      no_receipt: true,
      no_receipt_reason: 'Транзакция создана через голосовой ввод Siri'
    };

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

    const responseMessage = transactionDetails.type === 'expense'
      ? `Готово! Добавлен расход ${transactionDetails.amount}₽ - ${transactionDetails.description}`
      : `Готово! Добавлен приход ${transactionDetails.amount}₽ - ${transactionDetails.description}`;

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
