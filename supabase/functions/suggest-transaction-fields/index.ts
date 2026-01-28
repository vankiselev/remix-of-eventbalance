import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSystemSecret } from "../_shared/secrets.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || description.length < 5) {
      return new Response(JSON.stringify({ 
        suggestions: null, 
        confidence: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_AI_API_KEY = await getSystemSecret('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured in system_secrets');
    }

    const categories = [
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

    const projects = [
      'Расходы вне проекта',
      'Передача денег',
      'Склад / Офис',
      'Оплата связи и сервисов',
      'Уплата налогов',
      'Новогодняя премия',
      'Депозит',
      'Бонус',
      'Оклад Январь',
      'Оклад Февраль',
      'Оклад Март',
      'Оклад Апрель',
      'Оклад Май',
      'Оклад Июнь',
      'Оклад Июль',
      'Оклад Август',
      'Оклад Сентябрь',
      'Оклад Октябрь',
      'Оклад Ноябрь',
      'Оклад Декабрь',
    ];

    const systemPrompt = `Ты — помощник для автоматической категоризации финансовых транзакций в системе учета событий и мероприятий.

Твоя задача: проанализировать описание транзакции и определить:
1. **category** — категорию расхода/прихода (ОБЯЗАТЕЛЬНО выбрать из списка)
2. **project** — проект (ТОЛЬКО если явно следует из контекста, иначе null)
3. **transaction_type** — тип: "expense" (расход) или "income" (приход)
4. **confidence** — уровень уверенности от 0 до 1

ВАЖНЫЕ ПРАВИЛА:

**Категории с особой логикой:**
- Если описание содержит "перевел/передал/получил от/для Насти/Леры/Вани" → категория "Передано или получено от Леры/Насти/Вани"
- Если описание содержит "перевел/передал/получил от/для" другого сотрудника (Камилла, Маша, любое другое имя) → категория "Передано или получено от сотрудника"
- "Перевел Камилле" → категория "Передано или получено от сотрудника", НЕ "Передано или получено от Леры/Насти/Вани"

**Категории (выбери наиболее подходящую):**
${categories.map(c => `- ${c}`).join('\n')}

**Проекты (указывай ТОЛЬКО если явно следует из описания):**
${projects.map(p => `- ${p}`).join('\n')}

**Примеры:**

Описание: "Перевел деньги Камилле"
→ category: "Передано или получено от сотрудника"
→ project: "Передача денег"
→ transaction_type: "expense"
→ confidence: 0.95

Описание: "Получил от Насти на расходы"
→ category: "Передано или получено от Леры/Насти/Вани"
→ project: "Передача денег"
→ transaction_type: "income"
→ confidence: 0.95

Описание: "Купил шарики для декора"
→ category: "Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)"
→ project: null
→ transaction_type: "expense"
→ confidence: 0.9

Описание: "Такси до площадки"
→ category: "Доставка / Трансфер / Парковка / Вывоз мусора"
→ project: null
→ transaction_type: "expense"
→ confidence: 0.85

Описание: "Оплата УСН за квартал"
→ category: "Налог / УСН"
→ project: "Уплата налогов"
→ transaction_type: "expense"
→ confidence: 0.95

Описание: "Заказ торта"
→ category: "Еда / Напитки (сладкий стол, торт, кейтеринг)"
→ project: null
→ transaction_type: "expense"
→ confidence: 0.9

**ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В JSON:**
{
  "category": "название категории из списка или null",
  "project": "название проекта из списка или null", 
  "transaction_type": "expense" или "income",
  "confidence": число от 0 до 1
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: `Описание транзакции: "${description}"` }] }],
          generationConfig: { temperature: 0.3 }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        suggestions: null, 
        confidence: 0,
        error: 'AI service unavailable' 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return new Response(JSON.stringify({ 
        suggestions: null, 
        confidence: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from AI response
    let suggestions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      suggestions = JSON.parse(jsonString.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ 
        suggestions: null, 
        confidence: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      suggestions,
      confidence: suggestions.confidence || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-transaction-fields:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: null,
      confidence: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
