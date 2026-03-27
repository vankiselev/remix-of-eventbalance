/**
 * GigaChat AI client for Edge Functions.
 *
 * Secrets required (via system_secrets or Deno.env):
 *   GIGACHAT_CLIENT_ID      — Client ID from developers.sber.ru
 *   GIGACHAT_CLIENT_SECRET   — Client Secret
 *   GIGACHAT_SCOPE           — (optional) default "GIGACHAT_API_PERS"
 *   GIGACHAT_BASE_URL        — (optional) default "https://gigachat.devices.sberbank.ru"
 *   GIGACHAT_MODEL           — (optional) default "GigaChat"
 *   GIGACHAT_TIMEOUT_MS      — (optional) default 20000
 */

// ---------- Interfaces (kept identical for callers) ----------

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface AIProxyRequest {
  messages: Message[];
  tools?: Tool[];
  tool_choice?: { type: "function"; function: { name: string } };
}

interface AIProxyResponse {
  choices: Array<{
    message: {
      role: string;
      content?: string;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

// ---------- OAuth token cache ----------

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60 s margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("GIGACHAT_CLIENT_ID");
  const clientSecret = Deno.env.get("GIGACHAT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "GigaChat credentials not configured. Set GIGACHAT_CLIENT_ID and GIGACHAT_CLIENT_SECRET."
    );
  }

  const scope = Deno.env.get("GIGACHAT_SCOPE") || "GIGACHAT_API_PERS";
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const rquid = crypto.randomUUID();

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: rquid,
      Authorization: `Basic ${credentials}`,
    },
    body: `scope=${scope}`,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[gigachat-oauth] token error:", res.status, text);
    throw new Error(`GigaChat auth error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token as string;
  // Token lives 30 min; expires_at is epoch ms
  tokenExpiresAt = Number(data.expires_at) || Date.now() + 30 * 60 * 1000;

  return cachedToken!;
}

// ---------- Helpers ----------

function getTimeoutMs(): number {
  const raw = Deno.env.get("GIGACHAT_TIMEOUT_MS");
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 20_000;
}

function getBaseUrl(): string {
  return Deno.env.get("GIGACHAT_BASE_URL") || "https://gigachat.devices.sberbank.ru";
}

function getModel(): string {
  return Deno.env.get("GIGACHAT_MODEL") || "GigaChat";
}

// ---------- Main exported function ----------

export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const model = getModel();
  const timeoutMs = getTimeoutMs();

  const body: Record<string, unknown> = {
    model,
    messages: request.messages,
  };

  // GigaChat supports function_call / tools natively
  if (request.tools?.length) {
    body.functions = request.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    if (request.tool_choice) {
      body.function_call = { name: request.tool_choice.function.name };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("GigaChat request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[gigachat] API error:", res.status, errorText);

    if (res.status === 401) {
      // Invalidate cached token so next call re-authenticates
      cachedToken = null;
      tokenExpiresAt = 0;
      throw new Error("GigaChat auth failed. Please check credentials.");
    }
    if (res.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (res.status >= 500) {
      throw new Error("GigaChat service temporarily unavailable.");
    }
    throw new Error(`GigaChat API error: ${res.status}`);
  }

  const data = await res.json();

  // Normalize GigaChat response to OpenAI-compatible shape
  return normalizeResponse(data, request.tools);
}

/**
 * GigaChat returns function_call at message level instead of tool_calls array.
 * Normalize to the shape callers expect.
 */
function normalizeResponse(
  raw: Record<string, unknown>,
  tools?: Tool[]
): AIProxyResponse {
  const choices = (raw.choices as Array<Record<string, unknown>>) || [];
  const normalized = choices.map((c) => {
    const msg = c.message as Record<string, unknown> || {};
    const result: AIProxyResponse["choices"][0] = {
      message: {
        role: String(msg.role || "assistant"),
        content: (msg.content as string) ?? undefined,
      },
    };

    // GigaChat uses `function_call` field on the message
    const fc = msg.function_call as Record<string, unknown> | undefined;
    if (fc && fc.name) {
      let args = fc.arguments;
      if (typeof args === "object") {
        args = JSON.stringify(args);
      }
      result.message.tool_calls = [
        {
          function: {
            name: String(fc.name),
            arguments: String(args || "{}"),
          },
        },
      ];
    }

    // Also handle if GigaChat sends content with embedded JSON when tool was requested
    // but didn't use function_call format — fallback parsing
    if (!result.message.tool_calls && tools?.length && result.message.content) {
      const parsed = tryParseToolCallFromContent(result.message.content, tools);
      if (parsed) {
        result.message.tool_calls = [parsed];
      }
    }

    return result;
  });

  return { choices: normalized };
}

/**
 * Fallback: if model returns JSON in content instead of function_call,
 * wrap it to look like a tool call so callers don't break.
 */
function tryParseToolCallFromContent(
  content: string,
  tools: Tool[]
): { function: { name: string; arguments: string } } | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed !== "object" || parsed === null) return null;

    // Use first tool name
    const toolName = tools[0]?.function?.name;
    if (!toolName) return null;

    return {
      function: {
        name: toolName,
        arguments: JSON.stringify(parsed),
      },
    };
  } catch {
    return null;
  }
}

// ---------- Extractors (unchanged API) ----------

/**
 * Extract tool call arguments from AI response
 */
export function extractToolCallArgs<T>(
  response: AIProxyResponse,
  toolName: string
): T | null {
  const toolCall = response.choices?.[0]?.message?.tool_calls?.find(
    (tc) => tc.function.name === toolName
  );

  if (!toolCall) return null;

  try {
    return JSON.parse(toolCall.function.arguments) as T;
  } catch {
    console.error("Failed to parse tool call arguments");
    return null;
  }
}

/**
 * Extract text content from AI response
 */
export function extractTextContent(response: AIProxyResponse): string | null {
  return response.choices?.[0]?.message?.content ?? null;
}
