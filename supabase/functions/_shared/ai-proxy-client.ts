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

import { RUSSIAN_TRUSTED_ROOT_CA, RUSSIAN_TRUSTED_SUB_CA } from "./russian-ca-certs.ts";

// ---------- Interfaces ----------

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

// ---------- TLS client for Russian CA ----------

let _httpClient: Deno.HttpClient | null = null;

function getHttpClient(): Deno.HttpClient {
  if (!_httpClient) {
    _httpClient = Deno.createHttpClient({
      caCerts: [RUSSIAN_TRUSTED_ROOT_CA, RUSSIAN_TRUSTED_SUB_CA],
    });
  }
  return _httpClient;
}

// ---------- OAuth token cache ----------

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("GIGACHAT_CLIENT_ID");
  const clientSecret = Deno.env.get("GIGACHAT_CLIENT_SECRET");

  if (!clientId && !clientSecret) {
    throw new Error(
      "GigaChat credentials not configured. Set GIGACHAT_CLIENT_ID and GIGACHAT_CLIENT_SECRET (or GIGACHAT_AUTH_KEY)."
    );
  }

  // Trim whitespace/newlines/quotes
  const trimmedId = (clientId || '').trim().replace(/^["']|["']$/g, '');
  const trimmedSecret = (clientSecret || '').trim().replace(/^["']|["']$/g, '');

  const scope = Deno.env.get("GIGACHAT_SCOPE") || "GIGACHAT_API_PERS";
  const rquid = crypto.randomUUID();

  // Detect if GIGACHAT_CLIENT_SECRET is already base64(client_id:client_secret)
  // from developers.sber.ru "Authorization Data" field.
  // Heuristic: if it looks like valid base64 and decodes to something with ":",
  // use it directly. Otherwise encode client_id:client_secret.
  let credentials: string;
  let authMode: string;

  if (isAlreadyBase64AuthKey(trimmedSecret)) {
    // Secret is already the full base64-encoded auth key
    credentials = trimmedSecret;
    authMode = "pre-encoded";
  } else if (trimmedId && trimmedSecret) {
    // Raw client_id + client_secret → encode
    credentials = btoa(`${trimmedId}:${trimmedSecret}`);
    authMode = "encoded";
  } else {
    throw new Error("GigaChat: provide both CLIENT_ID+CLIENT_SECRET or a pre-encoded auth key as CLIENT_SECRET.");
  }

  console.log("[gigachat-oauth] Requesting token...", {
    scope,
    authMode,
    credentialsB64Len: credentials.length,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: rquid,
      Authorization: `Basic ${credentials}`,
    },
    body: `scope=${scope}`,
    // @ts-ignore — Deno-specific option for custom TLS
    client: getHttpClient(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[gigachat-oauth] token error:", res.status, text);
    throw new Error(`GigaChat auth error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token as string;
  tokenExpiresAt = Number(data.expires_at) || Date.now() + 30 * 60 * 1000;

  console.log("[gigachat-oauth] Token obtained, expires in ~30 min");
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
  const endpoint = `${baseUrl}/api/v1/chat/completions`;

  console.log("[gigachat] Request:", { endpoint, model, messagesCount: request.messages.length, hasTools: !!request.tools?.length });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      // @ts-ignore — Deno-specific option for custom TLS
      client: getHttpClient(),
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

  console.log("[gigachat] Response status:", res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[gigachat] API error:", res.status, errorText);

    if (res.status === 401) {
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
  return normalizeResponse(data, request.tools);
}

// ---------- Response normalization ----------

function normalizeResponse(
  raw: Record<string, unknown>,
  tools?: Tool[]
): AIProxyResponse {
  const choices = (raw.choices as Array<Record<string, unknown>>) || [];
  const normalized = choices.map((c) => {
    const msg = (c.message as Record<string, unknown>) || {};
    const result: AIProxyResponse["choices"][0] = {
      message: {
        role: String(msg.role || "assistant"),
        content: (msg.content as string) ?? undefined,
      },
    };

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

function tryParseToolCallFromContent(
  content: string,
  tools: Tool[]
): { function: { name: string; arguments: string } } | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed !== "object" || parsed === null) return null;

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

// ---------- Extractors ----------

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

export function extractTextContent(response: AIProxyResponse): string | null {
  return response.choices?.[0]?.message?.content ?? null;
}
