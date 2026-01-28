import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      console.error("GOOGLE_AI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          tools: [{
            functionDeclarations: [{
              name: "report_text_corrections",
              description: "Report spelling and grammar corrections for transaction description",
              parameters: {
                type: "OBJECT",
                properties: {
                  has_errors: { 
                    type: "BOOLEAN", 
                    description: "Whether the text has any spelling or grammar errors" 
                  },
                  corrected_text: { 
                    type: "STRING", 
                    description: "Corrected version of the text (or original if no errors)" 
                  },
                  errors: {
                    type: "ARRAY",
                    description: "List of found errors with corrections",
                    items: {
                      type: "OBJECT",
                      properties: {
                        original: { type: "STRING", description: "Original incorrect text" },
                        correction: { type: "STRING", description: "Corrected text" },
                        type: { type: "STRING", description: "Type of error: spelling, grammar, or style" }
                      },
                      required: ["original", "correction", "type"]
                    }
                  }
                },
                required: ["has_errors", "corrected_text", "errors"]
              }
            }]
          }],
          toolConfig: { functionCallingConfig: { mode: "ANY" } }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract function call result from Gemini response
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall) {
      console.error("No function call in response");
      return new Response(
        JSON.stringify({ has_errors: false, corrected_text: text, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = functionCall.args;
    console.log("Parsed result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in check-transaction-description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
