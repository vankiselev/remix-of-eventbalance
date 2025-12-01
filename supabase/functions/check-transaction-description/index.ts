import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Ты редактор финансовых описаний транзакций. Проверь текст на орфографические, грамматические и стилистические ошибки на русском языке.

Правила проверки:
- Орфография: исправляй опечатки и ошибки в написании слов
- Грамматика: исправляй грамматические ошибки
- Пунктуация: исправляй пропущенные или лишние знаки препинания

Стилистические правила:
- Текст ВСЕГДА должен начинаться с заглавной буквы
- Имена собственные (имена людей, названия компаний, городов) должны быть с заглавной буквы
- После точки следующее предложение начинается с заглавной буквы

Общие правила:
- Сохраняй смысл оригинала
- Не меняй числа, даты, суммы
- Не добавляй новую информацию
- Если текст начинается с маленькой буквы - это ошибка стиля, которую нужно исправить`;

    const userPrompt = category 
      ? `Текст: "${text}"\nКатегория транзакции: ${category}`
      : `Текст: "${text}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
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
                        type: { type: "string", enum: ["spelling", "grammar", "style"], description: "Type of error" }
                      },
                      required: ["original", "correction", "type"]
                    }
                  }
                },
                required: ["has_errors", "corrected_text", "errors"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_text_corrections" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ has_errors: false, corrected_text: text, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
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
