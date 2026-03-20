import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

/**
 * Get the AI proxy URL and key from system_secrets.
 * Falls back to env LOVABLE_API_KEY for Lovable Cloud deployments.
 */
async function getConfig(): Promise<{ mode: "direct"; apiKey: string } | { mode: "proxy"; proxyUrl: string; proxyKey: string }> {
  // First try direct mode (Lovable Cloud has LOVABLE_API_KEY in env)
  const directKey = Deno.env.get("LOVABLE_API_KEY");
  if (directKey) {
    return { mode: "direct", apiKey: directKey };
  }

  // Fallback: proxy mode via system_secrets (self-hosted Supabase)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const [proxyUrlResult, proxyKeyResult] = await Promise.all([
    supabase.rpc("get_system_secret", { secret_key: "LOVABLE_CLOUD_URL" }),
    supabase.rpc("get_system_secret", { secret_key: "AI_PROXY_KEY" }),
  ]);

  if (proxyUrlResult.error || proxyKeyResult.error) {
    console.error("Error fetching secrets:", proxyUrlResult.error, proxyKeyResult.error);
    throw new Error("Failed to fetch AI proxy secrets from system_secrets");
  }

  if (!proxyUrlResult.data || !proxyKeyResult.data) {
    throw new Error("AI proxy not configured. Add LOVABLE_CLOUD_URL and AI_PROXY_KEY to system_secrets.");
  }

  return {
    mode: "proxy",
    proxyUrl: proxyUrlResult.data,
    proxyKey: proxyKeyResult.data,
  };
}

/**
 * Call AI - either directly (Lovable Cloud) or via proxy (self-hosted)
 */
export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
  const config = await getConfig();

  let response: Response;

  if (config.mode === "direct") {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", ...request }),
    });
  } else {
    response = await fetch(`${config.proxyUrl}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AI-Proxy-Key": config.proxyKey,
      },
      body: JSON.stringify(request),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI error:", response.status, errorText);

    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("Payment required. Please add credits.");
    if (response.status === 401) throw new Error("Unauthorized. Check AI proxy configuration.");

    throw new Error(`AI service error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Extract tool call arguments from AI response
 */
export function extractToolCallArgs<T>(response: AIProxyResponse, toolName: string): T | null {
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
