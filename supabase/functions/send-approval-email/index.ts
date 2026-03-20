import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getSystemSecrets } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secrets = await getSystemSecrets(["RESEND_API_KEY", "SITE_URL"]);
    const resendApiKey = secrets["RESEND_API_KEY"];
    const siteUrl = secrets["SITE_URL"] || "https://eventbalance.ru";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const loginUrl = `${siteUrl}/auth`;
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || "";

    const emailResponse = await resend.emails.send({
      from: "EventBalance <noreply@eventbalance.ru>",
      to: [email],
      subject: "Доступ одобрен — EventBalance",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Добро пожаловать в EventBalance!</h1>
          
          <p>Привет${name ? `, ${name}` : ""}!</p>
          
          <p>Ваш аккаунт был одобрен администратором. Теперь вы можете войти в систему и начать работу.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                      font-weight: bold;">
              Войти в систему
            </a>
          </div>
          
          <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
          <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${loginUrl}
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            EventBalance — Система управления мероприятиями
          </p>
        </div>
      `,
    });

    console.log("Approval email sent to:", email, emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error.message);
    return new Response(
      JSON.stringify({ error: "Не удалось отправить письмо" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
