import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIProxy, extractToolCallArgs } from "../_shared/ai-proxy-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
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

interface AnalysisResult {
  corrected_text: string;
  has_errors: boolean;
  category: string | null;
  confidence: number;
  transaction_type: 'expense' | 'income';
  reasoning: string | null;
}

/** Minimum confidence to include category in response (below → null) */
const MIN_CONFIDENCE_TO_RETURN_CATEGORY = 0.6;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const currentCategory = body.currentCategory || null;

    if (!description || description.length < 2) {
      return new Response(JSON.stringify({
        success: true,
        corrected_text: description,
        has_errors: false,
        category: currentCategory,
        confidence: 0,
        transaction_type: 'expense',
        reasoning: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Truncate overly long descriptions
    const safeDescription = description.slice(0, 500);

    const systemPrompt = `Ты — помощник финансовой системы учёта мероприятий. Выполни ДВЕ задачи одновременно:

**ЗАДАЧА 1 — Исправление текста:**
- Исправь орфографию, грамматику, склонение имён (передал кому? — Камилле, Насте, Лере)
- Текст ВСЕГДА должен начинаться с заглавной буквы
- Имена собственные — с заглавной буквы
- НЕ добавляй точку в конце (это короткие заметки)
- Не меняй числа, даты, суммы, смысл
- Если ошибок нет — верни оригинал без изменений, has_errors=false

**ЗАДАЧА 2 — Категоризация:**
- Определи наиболее подходящую категорию из списка ниже
- Определи тип: "expense" (расход) или "income" (приход)
- Укажи confidence (0..1)
- Если не уверен (< 0.6), верни category: null

**Особые правила категоризации:**
- "перевел/передал/получил от Насти/Леры/Вани" → "Передано или получено от Леры/Насти/Вани"
- "перевел/передал/получил от" другого имени → "Передано или получено от сотрудника"

**Категории:**
${CATEGORIES.map(c => `- ${c}`).join('\n')}`;

    const userPrompt = currentCategory
      ? `Описание: "${safeDescription}"\nТекущая категория: ${currentCategory}`
      : `Описание: "${safeDescription}"`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "analyze_transaction",
        description: "Return text correction and category analysis for a transaction description",
        parameters: {
          type: "object",
          properties: {
            corrected_text: { type: "string", description: "Corrected text (starts with uppercase, no trailing dot)" },
            has_errors: { type: "boolean", description: "Whether the original text had errors" },
            category: { type: "string", description: "Best matching category from the list, or null" },
            confidence: { type: "number", description: "Confidence 0..1 for category" },
            transaction_type: { type: "string", enum: ["expense", "income"], description: "Transaction type" },
            reasoning: { type: "string", description: "Brief reasoning (1 sentence)" },
          },
          required: ["corrected_text", "has_errors", "category", "confidence", "transaction_type"],
        },
      },
    }];

    const response = await callAIProxy({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "analyze_transaction" } },
    });

    const result = extractToolCallArgs<AnalysisResult>(response, "analyze_transaction");

    if (!result) {
      console.error("[analyze-transaction] No tool call in response");
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to parse AI response",
        corrected_text: safeDescription,
        has_errors: false,
        category: currentCategory,
        confidence: 0,
        transaction_type: 'expense',
        reasoning: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ensure corrected_text starts with uppercase
    let corrected = (result.corrected_text || safeDescription).trim();
    if (corrected.length > 0) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }
    // Remove trailing dot
    if (corrected.endsWith('.')) {
      corrected = corrected.slice(0, -1);
    }

    // Validate category against list
    const validCategory = result.category && CATEGORIES.includes(result.category)
      ? result.category
      : null;

    const confidence = Math.max(0, Math.min(1, result.confidence || 0));

    console.log("[analyze-transaction] Done:", {
      has_errors: result.has_errors,
      category: validCategory,
      confidence,
    });

    return new Response(JSON.stringify({
      success: true,
      corrected_text: corrected,
      has_errors: !!result.has_errors,
      category: confidence >= MIN_CONFIDENCE_TO_RETURN_CATEGORY ? validCategory : null,
      confidence,
      transaction_type: result.transaction_type || 'expense',
      reasoning: result.reasoning || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("[analyze-transaction] Error:", msg);

    if (msg.includes("Rate limit")) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (msg.includes("Payment required")) {
      return new Response(JSON.stringify({ success: false, error: 'Payment required' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
