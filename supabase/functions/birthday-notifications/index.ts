import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[birthday-notifications] Starting birthday check...');

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    // Find employees with birthdays today
    const { data: birthdayPeople, error: birthdayError } = await supabase
      .from('profiles')
      .select('id, full_name, birth_date')
      .eq('employment_status', 'active')
      .not('birth_date', 'is', null);

    if (birthdayError) throw birthdayError;

    const todayBirthdays = birthdayPeople?.filter(person => {
      if (!person.birth_date) return false;
      const birthDate = new Date(person.birth_date);
      return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
    }) || [];

    console.log('[birthday-notifications] Today birthdays:', todayBirthdays.length);

    if (todayBirthdays.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No birthdays today', sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get all active employees to notify them
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('employment_status', 'active');

    if (employeesError) throw employeesError;

    // Prepare birthday messages
    const birthdayNames = todayBirthdays.map(p => p.full_name).join(', ');
    const title = todayBirthdays.length === 1 
      ? 'День рождения коллеги' 
      : 'Дни рождения коллег';
    const message = todayBirthdays.length === 1
      ? `Сегодня день рождения у ${birthdayNames}! Не забудьте поздравить 🎉`
      : `Сегодня день рождения у: ${birthdayNames}! Не забудьте поздравить 🎉`;

    // Send notifications to all employees
    const notificationPromises = employees?.map((employee) =>
      supabase
        .from("notifications")
        .insert({
          user_id: employee.id,
          title,
          message,
          type: 'system',
          data: {
            birthday_people: todayBirthdays.map(p => ({
              id: p.id,
              name: p.full_name,
              birth_date: p.birth_date,
            })),
          },
        })
    ) || [];

    const results = await Promise.allSettled(notificationPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log('[birthday-notifications] Results:', { successCount, failCount, totalBirthdays: todayBirthdays.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} birthday notifications`,
        sent: successCount,
        failed: failCount,
        birthdays_count: todayBirthdays.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('[birthday-notifications] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
