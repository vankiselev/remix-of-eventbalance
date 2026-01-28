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
 * Get secrets from system_secrets table
 */
async function getSecrets(): Promise<{ proxyUrl: string; proxyKey: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[getSecrets] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get both secrets in parallel
  const [proxyUrlResult, proxyKeyResult] = await Promise.all([
    supabase.rpc('get_system_secret', { secret_key: 'LOVABLE_CLOUD_URL' }),
    supabase.rpc('get_system_secret', { secret_key: 'AI_PROXY_KEY' }),
  ]);

  if (proxyUrlResult.error || proxyKeyResult.error) {
    console.error('[getSecrets] Error fetching secrets:', proxyUrlResult.error, proxyKeyResult.error);
    return null;
  }

  if (!proxyUrlResult.data || !proxyKeyResult.data) {
    console.error('[getSecrets] Missing LOVABLE_CLOUD_URL or AI_PROXY_KEY in system_secrets');
    return null;
  }

  return {
    proxyUrl: proxyUrlResult.data,
    proxyKey: proxyKeyResult.data,
  };
}

/**
 * Call AI through Lovable Cloud proxy
 */
export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
  const secrets = await getSecrets();
  
  if (!secrets) {
    throw new Error("AI proxy not configured. Add LOVABLE_CLOUD_URL and AI_PROXY_KEY to system_secrets.");
  }

  const response = await fetch(`${secrets.proxyUrl}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AI-Proxy-Key": secrets.proxyKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Proxy error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits.");
    }
    if (response.status === 401) {
      throw new Error("Unauthorized. Check AI_PROXY_KEY configuration.");
    }
    
    throw new Error(`AI service error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Extract tool call arguments from AI response
 */
export function extractToolCallArgs<T>(response: AIProxyResponse, toolName: string): T | null {
  const toolCall = response.choices?.[0]?.message?.tool_calls?.find(
    tc => tc.function.name === toolName
  );
  
  if (!toolCall) {
    return null;
  }

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
