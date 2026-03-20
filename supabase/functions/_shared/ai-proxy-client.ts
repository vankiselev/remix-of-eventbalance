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
 * Call AI through Lovable AI Gateway directly using LOVABLE_API_KEY
 */
export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      ...request,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits.");
    }
    if (response.status === 401) {
      throw new Error("Unauthorized. Check LOVABLE_API_KEY configuration.");
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
