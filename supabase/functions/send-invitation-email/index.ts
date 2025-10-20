import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
        JSON.stringify({ error: 'Authentication required' }),
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
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .rpc('get_user_basic_profile')
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, token, firstName, lastName, role }: InvitationEmailRequest = await req.json();
    
    // Validate inputs
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidUUID(token)) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role !== 'admin' && role !== 'employee') {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
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
    const roleDisplay = role === 'admin' ? 'Администратор' : 'Сотрудник';

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
        error: 'Failed to send invitation email. Please try again later.'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);