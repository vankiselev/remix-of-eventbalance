import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, firstName, lastName, role }: InvitationEmailRequest = await req.json();

    const baseUrl = Deno.env.get("SITE_URL") || "https://eventbalance.ru";
    const inviteUrl = `${baseUrl}/invite?token=${token}`;
    
    const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;
    const roleDisplay = role === 'admin' ? 'Администратор' : 'Сотрудник';

    const emailResponse = await resend.emails.send({
      from: "EventBalance <onboarding@resend.dev>",
      to: [email],
      subject: "Приглашение в EventBalance",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Приглашение в EventBalance</h1>
          
          <p>Привет${firstName ? `, ${firstName}` : ''}!</p>
          
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

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);