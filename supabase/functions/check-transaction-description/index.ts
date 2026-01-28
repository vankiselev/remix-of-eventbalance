import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIProxy, extractToolCallArgs } from "../_shared/ai-proxy-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckResult {
  has_errors: boolean;
  corrected_text: string;
  errors: Array<{
    original: string;
    correction: string;
    type: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, category } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ has_errors: false, corrected_text: text, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Ты редактор финансовых описаний транзакций. Проверь текст на орфографические, грамматические и стилистические ошибки на русском языке.

Правила проверки:
- Орфография: исправляй опечатки и ошибки в написании слов
- Грамматика: исправляй грамматические ошибки, включая правильное склонение слов по падежам
- Склонение имён: используй правильные падежные формы (например: передал кому? - Камилле, Насте, Лере)

Стилистические правила:
- Текст ВСЕГДА должен начинаться с заглавной буквы
- Имена собственные (имена людей, названия компаний, городов) должны быть с заглавной буквы
- После точки следующее предложение начинается с заглавной буквы

ВАЖНО - формат описаний транзакций:
- Это короткие заметки, НЕ полноценные предложения
- НЕ добавляй точку в конце текста
- НЕ добавляй никакую пунктуацию в конце, если её не было в оригинале
- Убирай лишнюю точку в конце, если она там есть

Общие правила:
- Сохраняй смысл оригинала
- Не меняй числа, даты, суммы
- Не добавляй новую информацию
- Если текст начинается с маленькой буквы - это ошибка стиля, которую нужно исправить`;

    const userPrompt = category 
      ? `Текст: "${text}"\nКатегория транзакции: ${category}`
      : `Текст: "${text}"`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "report_text_corrections",
          description: "Report spelling and grammar corrections for transaction description",
          parameters: {
            type: "object",
            properties: {
              has_errors: { 
                type: "boolean", 
                description: "Whether the text has any spelling or grammar errors" 
              },
              corrected_text: { 
                type: "string", 
                description: "Corrected version of the text (or original if no errors)" 
              },
              errors: {
                type: "array",
                description: "List of found errors with corrections",
                items: {
                  type: "object",
                  properties: {
                    original: { type: "string", description: "Original incorrect text" },
                    correction: { type: "string", description: "Corrected text" },
                    type: { type: "string", description: "Type of error: spelling, grammar, or style" }
                  },
                  required: ["original", "correction", "type"]
                }
              }
            },
            required: ["has_errors", "corrected_text", "errors"]
          }
        }
      }
    ];

    const response = await callAIProxy({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools,
      tool_choice: { type: "function", function: { name: "report_text_corrections" } }
    });

    const result = extractToolCallArgs<CheckResult>(response, "report_text_corrections");
    
    if (!result) {
      console.error("No function call in response");
      return new Response(
        JSON.stringify({ has_errors: false, corrected_text: text, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Parsed result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in check-transaction-description:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Handle specific errors from AI proxy
    if (errorMessage.includes("Rate limit")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (errorMessage.includes("Payment required")) {
      return new Response(
        JSON.stringify({ error: "Payment required. Please add credits." }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
