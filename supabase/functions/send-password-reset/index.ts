import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  email: string;
}

serve(async (req) => {
  console.log('send-password-reset function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const siteUrl = Deno.env.get('SITE_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    console.log('Environment check:', {
      hasSiteUrl: !!siteUrl,
      hasResendApiKey: !!resendApiKey,
    });

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { email }: RequestBody = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing password reset request for email: ${email}`)

    // Call the secure database function to create reset token  
    const { data: resetResult, error: resetError } = await supabaseClient.rpc(
      'request_password_reset',
      { user_email: email }
    )

    if (resetError) {
      console.error('Error creating reset token:', resetError)
      // Still return success to not leak email existence
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link has been sent' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user using admin API
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    const user = users?.find(u => u.email === email);

    if (userError || !user) {
      console.log('User not found or error:', userError);
      // User doesn't exist, but don't reveal this
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link has been sent' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User found:', user.id);

    // Get the generated token from the database (for sending email)
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('password_reset_tokens')
      .select('token')
      .eq('user_id', user.id)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) {
      console.error('Error retrieving token:', tokenError)
      // Still return success to not leak email existence
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link has been sent' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Token retrieved successfully');

    // Send email using Resend
    const baseUrl = siteUrl || 'https://eventbalance.ru';
    const resetUrl = `${baseUrl}/reset-password?token=${tokenData.token}`
    
    console.log('Generated reset URL:', resetUrl);
    
    console.log('Sending email via Resend...');
    
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'EventBalance <noreply@eventbalance.ru>',
        to: [email],
        subject: 'Сброс пароля - EventBalance',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Сброс пароля</h2>
            <p>Вы запросили сброс пароля для вашего аккаунта EventBalance.</p>
            <p>Нажмите на ссылку ниже, чтобы создать новый пароль:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Сбросить пароль
            </a>
            <p>Ссылка действительна в течение 1 часа.</p>
            <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error('Failed to send email:', errorText)
      // Still return success to not leak information
    } else {
      console.log('Password reset email sent successfully')
    }

    return new Response(
      JSON.stringify({ message: 'If the email exists, a reset link has been sent' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error in send-password-reset function:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})