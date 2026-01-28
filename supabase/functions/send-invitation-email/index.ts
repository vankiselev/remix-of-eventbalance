import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getSystemSecrets } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  token: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleName?: string;
}

// Input validation utilities
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
}

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

function sanitizeString(str: string, maxLength: number): string {
  return str.trim().slice(0, maxLength);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role or is tenant owner using RPC
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    // Also check tenant membership for owners
    const { data: memberships } = await supabaseClient
      .rpc('get_user_tenant_memberships');
    
    const isOwner = Array.isArray(memberships) && memberships.some((m: any) => m.is_owner);
    
    if (roleError) {
      console.error("Role check error:", roleError);
    }
    
    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Требуются права администратора или владельца компании' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get secrets from database
    const secrets = await getSystemSecrets(['RESEND_API_KEY', 'SITE_URL']);
    const resendApiKey = secrets['RESEND_API_KEY'];
    const siteUrl = secrets['SITE_URL'];

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured in system_secrets");
    }

    const resend = new Resend(resendApiKey);

    const { email, token, firstName, lastName, role, roleName }: InvitationEmailRequest = await req.json();
    
    // Validate inputs
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Некорректный формат email' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidUUID(token)) {
      return new Response(
        JSON.stringify({ error: 'Некорректный формат токена' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role is not empty
    if (!role || role.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Некорректная роль' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize string inputs
    const safeFirstName = firstName ? sanitizeString(firstName, 50) : undefined;
    const safeLastName = lastName ? sanitizeString(lastName, 50) : undefined;
    
    console.log("Processing invitation for:", { email, role, hasFirstName: !!safeFirstName, hasLastName: !!safeLastName });

    const baseUrl = siteUrl || "https://eventbalance.ru";
    const inviteUrl = `${baseUrl}/invite?token=${token}`;
    
    console.log("Generated invite URL:", inviteUrl);
    
    const displayName = safeFirstName && safeLastName ? `${safeFirstName} ${safeLastName}` : email;
    const roleDisplay = roleName || (role === 'admin' ? 'Администратор' : 'Сотрудник');

    console.log("Sending email via Resend...");
    
    const emailResponse = await resend.emails.send({
      from: "EventBalance <noreply@eventbalance.ru>",
      to: [email],
      subject: "Приглашение в EventBalance",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Приглашение в EventBalance</h1>
          
          <p>Привет${safeFirstName ? `, ${safeFirstName}` : ''}!</p>
          
          <p>Вы приглашены присоединиться к системе управления мероприятиями EventBalance в роли <strong>${roleDisplay}</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                      font-weight: bold;">
              Присоединиться
            </a>
          </div>
          
          <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
          <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${inviteUrl}
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Это приглашение действительно в течение 7 дней. 
            Если вы не запрашивали доступ к EventBalance, просто проигнорируйте это письмо.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            EventBalance - Система управления мероприятиями
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    // Log detailed errors SERVER-SIDE ONLY
    console.error("Error in send-invitation-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
    
    // Return GENERIC error to client
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось отправить приглашение. Попробуйте позже.'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
