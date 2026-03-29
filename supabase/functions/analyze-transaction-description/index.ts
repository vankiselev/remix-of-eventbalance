import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIProxy, extractToolCallArgs } from "../_shared/ai-proxy-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GrammarResult {
  corrected_text: string;
  has_errors: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!description || description.length < 2) {
      return new Response(JSON.stringify({
        success: true,
        corrected_text: description,
        has_errors: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Truncate overly long descriptions
    const safeDescription = description.slice(0, 500);

    const systemPrompt = `Ты — корректор русского текста для финансовых заметок. 

**Твоя ЕДИНСТВЕННАЯ задача — исправить текст:**
- Исправь орфографию и грамматику
- Исправь склонение имён (передал кому? — Камилле, Насте, Лере)
- Текст ВСЕГДА должен начинаться с заглавной буквы
- Имена собственные — с заглавной буквы
- НЕ добавляй точку в конце (это короткие заметки)
- Не меняй числа, даты, суммы, смысл
- Если ошибок нет — верни оригинал без изменений, has_errors=false

**НЕ определяй категорию, проект, кошелёк или тип операции — только текст.**`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "correct_text",
        description: "Return corrected text for a transaction description",
        parameters: {
          type: "object",
          properties: {
            corrected_text: { type: "string", description: "Corrected text (starts with uppercase, no trailing dot)" },
            has_errors: { type: "boolean", description: "Whether the original text had errors" },
          },
          required: ["corrected_text", "has_errors"],
        },
      },
    }];

    const response = await callAIProxy({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Текст: "${safeDescription}"` },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "correct_text" } },
    });

    const result = extractToolCallArgs<GrammarResult>(response, "correct_text");

    if (!result) {
      console.error("[analyze-transaction] No tool call in response");
      return new Response(JSON.stringify({
        success: true,
        corrected_text: safeDescription,
        has_errors: false,
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

    console.log("[analyze-transaction] Grammar done:", {
      has_errors: result.has_errors,
      original: safeDescription,
      corrected,
    });

    return new Response(JSON.stringify({
      success: true,
      corrected_text: corrected,
      has_errors: !!result.has_errors,
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
