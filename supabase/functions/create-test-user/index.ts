import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate random password
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "Test";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += "!";
  return password;
}

// Transliterate Russian to Latin
function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
    'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };
  return text.split('').map(char => map[char] || char).join('');
}

// Generate email from name
function generateEmail(firstName?: string, lastName?: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  if (firstName || lastName) {
    const first = transliterate(firstName || '').toLowerCase().replace(/[^a-z]/g, '');
    const last = transliterate(lastName || '').toLowerCase().replace(/[^a-z]/g, '');
    const namePart = [first, last].filter(Boolean).join('-') || 'user';
    return `test-${namePart}-${random}@test.local`;
  }
  
  return `test-user-${timestamp}-${random}@test.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      throw new Error("Unauthorized");
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_user", { _user_id: caller.id });
    if (!isAdmin) {
      throw new Error("Only admins can create test users");
    }

    const { firstName, lastName } = await req.json();

    // Auto-generate email and password
    const email = generateEmail(firstName, lastName);
    const password = generatePassword();

    console.log(`Creating test user: ${email}`);

    // Create user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: `${lastName || ""} ${firstName || ""}`.trim() || "Тестовый пользователь",
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    console.log("User created:", newUser.user?.id);

    // Mark as test user (do NOT store password - security risk)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        is_test_user: true,
        temp_password: null, // Never store plaintext passwords
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: `${lastName || ""} ${firstName || ""}`.trim() || "Тестовый пользователь",
      })
      .eq("id", newUser.user!.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't throw - user is created, just profile update failed
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user?.id,
        email,
        password 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
