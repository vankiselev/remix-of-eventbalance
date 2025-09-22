import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DriveSetupRequest {
  userId: string;
  folderName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting setup-employee-drive function');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')!;
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, folderName }: DriveSetupRequest = await req.json();

    console.log('Setting up Drive folder for user:', userId, 'with name:', folderName);

    // Generate JWT token for Google APIs
    const jwtToken = await generateJwtToken(googleClientEmail, googlePrivateKey);

    // Get access token
    const accessToken = await getAccessToken(jwtToken);

    // Create folder in Google Drive
    const folder = await createDriveFolder(folderName, accessToken);

    console.log('Created folder:', folder);

    // Update user profile with Drive folder information
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_drive_folder_id: folder.id,
        google_drive_folder_url: `https://drive.google.com/drive/folders/${folder.id}`
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Drive folder created and linked successfully',
      folderId: folder.id,
      folderUrl: `https://drive.google.com/drive/folders/${folder.id}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in setup-employee-drive function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateJwtToken(clientEmail: string, privateKey: string) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Simple JWT encoding (for production, use a proper JWT library)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Note: For production use, implement proper RS256 signing
  // This is a simplified version that would need proper crypto implementation
  const token = `${encodedHeader}.${encodedPayload}.signature`;
  
  return token;
}

async function getAccessToken(jwtToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createDriveFolder(folderName: string, accessToken: string) {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [] // Creates in root directory
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Drive folder: ${response.statusText}`);
  }

  const folder = await response.json();
  return folder;
}