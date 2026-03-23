import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIProxy, extractTextContent } from "../_shared/ai-proxy-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Агентская комиссия",
  "Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)",
  "Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)",
  "Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)",
  "Выступление артистов (диджеи, селебрити, кавер-группы)",
  "Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)",
  "Доставка / Трансфер / Парковка / Вывоз мусора",
  "Еда / Напитки (сладкий стол, торт, кейтеринг)",
  "Закупки / Оплаты (ФИН, офис, склад, компания)",
  "Залог (внесли/вернули)",
  "Комиссия за перевод",
  "Монтаж / Демонтаж",
  "Накладные расходы (райдер, траты вне сметы)",
  "Передано или получено от Леры/Насти/Вани",
  "Передано или получено от сотрудника",
  "Печать (баннеры, меню, карточки)",
  "Площадка (депозит, аренда, доп. услуги)",
  "Получено/Возвращено клиенту",
  "Производство (декорации, костюмы)",
  "Прочие специалисты",
  "Фотограф / Видеограф",
  "Налог / УСН",
] as const;

const WALLETS = [
  "Наличка Настя", "Наличка Лера", "Наличка Ваня",
  "Корп. карта Настя", "Корп. карта Лера", "Корп. карта Ваня",
  "ИП Настя", "ИП Лера", "ИП Ваня",
  "ООО Настя", "ООО Лера", "ООО Ваня",
  "Своя Лера", "Своя Настя", "Своя Ваня",
] as const;

type TxType = "income" | "expense";

interface ParsedTx {
  amount: number;
  description: string;
  type: TxType;
  suggestedCategory: string;
  cashType: string | null;
  confidence: number;
}

const PERSON_ALIASES: Record<string, "Ваня" | "Лера" | "Настя"> = {
  "ваня": "Ваня",
  "ване": "Ваня",
  "ваню": "Ваня",
  "вани": "Ваня",
  "иван": "Ваня",
  "ивану": "Ваня",
  "лера": "Лера",
  "лере": "Лера",
  "леру": "Лера",
  "леры": "Лера",
  "валерия": "Лера",
  "настя": "Настя",
  "насте": "Настя",
  "настю": "Настя",
  "насти": "Настя",
  "анастасия": "Настя",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/[—–]/g, "-")
    .trim();
}

function extractAmount(text: string): number {
  const matches = text.match(/\d[\d\s.,]*/g);
  if (!matches?.length) return 0;

  for (const match of matches) {
    const digitsOnly = match.replace(/\D/g, "");
    if (!digitsOnly) continue;

    const amount = Number.parseInt(digitsOnly, 10);
    if (Number.isFinite(amount) && amount > 0 && amount < 1000000000) {
      return amount;
    }
  }

  return 0;
}

function findPersonInText(text: string): "Ваня" | "Лера" | "Настя" | null {
  const words = text
    .toLowerCase()
    .replace(/[^а-яёa-z\s-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    if (PERSON_ALIASES[word]) {
      return PERSON_ALIASES[word];
    }
  }

  return null;
}

function extractTransferRecipient(text: string): { raw: string | null; owner: "Ваня" | "Лера" | "Настя" | null } {
  const transferMatch = text.match(/(?:передал(?:а)?|перев[её]л(?:а)?|отдал(?:а)?|перекинул(?:а)?|выдал(?:а)?)\s+(?:деньги\s+)?([а-яёa-z-]+)/i);
  if (!transferMatch?.[1]) {
    return { raw: null, owner: null };
  }

  const raw = transferMatch[1].trim();
  const owner = PERSON_ALIASES[raw.toLowerCase()] ?? null;
  return { raw: raw.charAt(0).toUpperCase() + raw.slice(1), owner };
}

function walletOwnerFromWallet(wallet: string): "Ваня" | "Лера" | "Настя" {
  if (wallet.includes("Лера")) return "Лера";
  if (wallet.includes("Настя")) return "Настя";
  return "Ваня";
}

function normalizeWallet(text: string, defaultWallet: string): string {
  const lower = text.toLowerCase();
  const person = findPersonInText(text) ?? walletOwnerFromWallet(defaultWallet);

  if (lower.includes("корп") || lower.includes("карт")) return `Корп. карта ${person}`;
  if (lower.includes(" ип") || lower.startsWith("ип ")) return `ИП ${person}`;
  if (lower.includes("ооо") || lower.includes("компани")) return `ООО ${person}`;
  if (lower.includes("своя") || lower.includes("личн")) return `Своя ${person}`;
  if (lower.includes("налич") || lower.includes("нал ")) return `Наличка ${person}`;

  return defaultWallet;
}

function detectType(text: string): TxType {
  const lower = text.toLowerCase();

  const transfer = /передал|перев[её]л|отдал|перекинул|выдал/.test(lower);
  if (transfer) return "expense";

  const income = /приход|получил|получила|поступил|поступление|получено|зачисл|доход|оплата от/.test(lower);
  if (income) return "income";

  const expense = /расход|потрат|купил|купила|заплат|оплатил|оплатила|такси|доставка/.test(lower);
  if (expense) return "expense";

  return "expense";
}

function detectCategory(text: string, type: TxType, recipient: { raw: string | null; owner: "Ваня" | "Лера" | "Настя" | null }): string {
  const lower = text.toLowerCase();

  if (/передал|перев[её]л|отдал|перекинул|выдал/.test(lower)) {
    if (recipient.owner) return "Передано или получено от Леры/Насти/Вани";
    return "Передано или получено от сотрудника";
  }

  if (type === "income") {
    return "Получено/Возвращено клиенту";
  }

  if (/такси|доставка|трансфер|парков/.test(lower)) {
    return "Доставка / Трансфер / Парковка / Вывоз мусора";
  }

  if (/фото|видео|фотограф|видеограф/.test(lower)) {
    return "Фотограф / Видеограф";
  }

  if (/торт|кейтеринг|еда|напитк|сладк/.test(lower)) {
    return "Еда / Напитки (сладкий стол, торт, кейтеринг)";
  }

  if (/монтаж|демонтаж/.test(lower)) {
    return "Монтаж / Демонтаж";
  }

  if (/налог|усн/.test(lower)) {
    return "Налог / УСН";
  }

  return "Накладные расходы (райдер, траты вне сметы)";
}

function buildDescription(text: string, type: TxType, recipient: { raw: string | null }): string {
  const clean = normalizeText(text);

  if (/передал|перев[её]л|отдал|перекинул|выдал/i.test(clean) && recipient.raw) {
    return `Передал ${recipient.raw}`;
  }

  if (type === "income" && /клиент/i.test(clean)) {
    return "Приход от клиента";
  }

  const withoutAmount = clean.replace(/\d[\d\s.,]*/g, "").replace(/руб(лей|ля|ль)?|₽/gi, "").trim();
  if (withoutAmount.length >= 3) {
    return withoutAmount.slice(0, 64);
  }

  return type === "income" ? "Приход" : "Расход";
}

function calculateConfidence(parsed: ParsedTx, sourceText: string, recipient: { raw: string | null }): number {
  let confidence = 35;

  if (parsed.amount > 0) confidence += 30;
  if (parsed.description.length >= 3) confidence += 10;
  if (parsed.suggestedCategory) confidence += 10;
  if (parsed.cashType) confidence += 10;
  if (/передал|перев[её]л|отдал|перекинул|выдал/i.test(sourceText) && recipient.raw) confidence += 10;

  if (parsed.amount <= 0) confidence -= 25;

  return Math.max(0, Math.min(100, confidence));
}

function parseByRules(text: string, defaultWallet: string): ParsedTx {
  const normalized = normalizeText(text);
  const amount = extractAmount(normalized);
  const type = detectType(normalized);
  const recipient = extractTransferRecipient(normalized);
  const cashType = normalizeWallet(normalized, defaultWallet);
  const suggestedCategory = detectCategory(normalized, type, recipient);
  const description = buildDescription(normalized, type, recipient);

  const parsed: ParsedTx = {
    amount,
    description,
    type,
    suggestedCategory,
    cashType,
    confidence: 0,
  };

  parsed.confidence = calculateConfidence(parsed, normalized, recipient);
  return parsed;
}

async function parseByAI(text: string): Promise<ParsedTx | null> {
  if (!Deno.env.get("LOVABLE_API_KEY")) return null;

  const systemPrompt = `Верни только JSON для финансовой транзакции из русского текста:
{
  "amount": number,
  "description": string,
  "type": "income" | "expense",
  "suggestedCategory": string,
  "cashType": string | null,
  "confidence": number
}

Категории: ${CATEGORIES.join("; ")}
Кошельки: ${WALLETS.join("; ")}

Правила:
- перевод сотруднику: "передал/перевел/отдал" → expense
- "приход/получил/оплата от клиента" → income
- если не уверен, confidence < 50
- если суммы нет, amount=0`;

  try {
    const response = await callAIProxy({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const content = extractTextContent(response);
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      amount: Number(parsed.amount || 0),
      description: String(parsed.description || "").slice(0, 64),
      type: parsed.type === "income" ? "income" : "expense",
      suggestedCategory: CATEGORIES.includes(parsed.suggestedCategory) ? parsed.suggestedCategory : "Накладные расходы (райдер, траты вне сметы)",
      cashType: WALLETS.includes(parsed.cashType) ? parsed.cashType : null,
      confidence: Number(parsed.confidence || 0),
    };
  } catch (error) {
    console.error("[voice-transaction] AI parse failed:", error);
    return null;
  }
}

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return jsonResponse({ success: false, error: "Необходима авторизация. Перезайдите в приложение." }, 401);
    }

    const { text, step, step1Data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const authHeader = req.headers.get("authorization")!;

    // Use the user's own JWT for all DB operations (works with RLS)
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: voiceSettings } = await userClient
      .from("user_voice_settings")
      .select("default_wallet, default_project_id")
      .eq("user_id", userId)
      .maybeSingle();

    const defaultWallet = voiceSettings?.default_wallet || "Наличка Ваня";

    // Create draft step
    if (step === "create") {
      if (!step1Data) {
        return jsonResponse({ success: false, error: "Нет данных для создания транзакции." });
      }

      const amount = Number(step1Data.amount || 0);
      if (!amount || amount <= 0) {
        return jsonResponse({ success: false, error: "Сумма должна быть больше нуля." });
      }

      const cashType = WALLETS.includes(step1Data.cashType) ? step1Data.cashType : defaultWallet;
      const category = CATEGORIES.includes(step1Data.suggestedCategory)
        ? step1Data.suggestedCategory
        : "Накладные расходы (райдер, траты вне сметы)";
      const txType: TxType = step1Data.type === "income" ? "income" : "expense";

      // Get user's tenant_id for proper data isolation
      const { data: membership } = await userClient
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      const tenantId = membership?.tenant_id || null;

      const { data: transaction, error: txError } = await userClient
        .from("financial_transactions")
        .insert({
          created_by: userId,
          tenant_id: tenantId,
          operation_date: new Date().toISOString().split("T")[0],
          income_amount: txType === "income" ? amount : 0,
          expense_amount: txType === "expense" ? amount : 0,
          category,
          cash_type: cashType,
          description: String(step1Data.description || "").slice(0, 255),
          project_owner: cashType,
          no_receipt: true,
          no_receipt_reason: "Голосовой ввод",
          is_draft: true,
          requires_verification: false,
          project_id: voiceSettings?.default_project_id || null,
          static_project_name: voiceSettings?.default_project_id ? null : "Расходы вне проекта",
        })
        .select("id")
        .single();

      if (txError) {
        console.error("[voice-transaction] create draft error:", JSON.stringify(txError));
        const msg = txError.code === "42501"
          ? "Нет прав для создания транзакции. Обратитесь к администратору."
          : txError.code === "23505"
          ? "Такая транзакция уже существует."
          : `Не удалось создать черновик: ${txError.message || "неизвестная ошибка"}`;
        return jsonResponse({ success: false, error: msg });
      }

      return jsonResponse({
        success: true,
        message: "Черновик создан",
        transaction: { id: transaction.id, is_draft: true },
      });
    }

    // Parse step
    const sourceText = normalizeText(String(text || ""));
    if (!sourceText) {
      return jsonResponse({ success: false, error: "Скажите или введите текст транзакции." });
    }

    const ruleParsed = parseByRules(sourceText, defaultWallet);

    // Rule parser confident enough -> use it
    if (ruleParsed.amount > 0 && ruleParsed.confidence >= 60) {
      return jsonResponse({ success: true, ...ruleParsed });
    }

    // Try AI fallback only when available
    const aiParsed = await parseByAI(sourceText);
    if (aiParsed && aiParsed.amount > 0) {
      const merged: ParsedTx = {
        amount: aiParsed.amount,
        description: aiParsed.description || ruleParsed.description,
        type: aiParsed.type,
        suggestedCategory: aiParsed.suggestedCategory,
        cashType: aiParsed.cashType || ruleParsed.cashType || defaultWallet,
        confidence: Math.max(aiParsed.confidence || 0, ruleParsed.confidence || 0),
      };
      return jsonResponse({ success: true, ...merged });
    }

    // Fallback with clear guidance instead of 502
    if (ruleParsed.amount <= 0) {
      return jsonResponse({
        success: false,
        error: "Не удалось определить сумму. Добавьте сумму, например: «такси 500 рублей».",
        partialData: ruleParsed,
      });
    }

    return jsonResponse({
      success: false,
      error: "Не удалось уверенно разобрать фразу. Уточните назначение платежа или кошелёк.",
      partialData: ruleParsed,
    });
  } catch (error) {
    console.error("[voice-transaction] fatal error:", error);
    return jsonResponse({ success: false, error: "Внутренняя ошибка обработки голосового ввода." }, 500);
  }
});
