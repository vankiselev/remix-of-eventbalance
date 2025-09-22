import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  userId: string;
  sheetId?: string;
  action: 'sync' | 'setup';
}

interface TransactionData {
  operation_date: string;
  project_owner: string;
  description: string;
  expense_amount: number;
  income_amount: number;
  category: string;
  project_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting sync-employee-sheets function');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')!;
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody: SyncRequest = await req.json();
    const { userId, sheetId, action } = requestBody;

    console.log('Request data:', { userId, sheetId, action });

    if (action === 'setup') {
      // Create a new Google Sheet for the employee
      const accessToken = await getGoogleAccessToken(googleClientEmail, googlePrivateKey);
      const newSheetResponse = await createEmployeeSheet(userId, accessToken);
      
      // Update user profile with sheet information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          google_sheet_id: newSheetResponse.spreadsheetId,
          google_sheet_url: newSheetResponse.spreadsheetUrl
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Google Sheet created and linked successfully',
        spreadsheetId: newSheetResponse.spreadsheetId,
        spreadsheetUrl: newSheetResponse.spreadsheetUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync' && sheetId) {
      // Get user's transactions from database
      const { data: transactions, error: transactionError } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          events(name)
        `)
        .eq('created_by', userId)
        .order('operation_date', { ascending: false });

      if (transactionError) {
        console.error('Error fetching transactions:', transactionError);
        throw transactionError;
      }

      console.log(`Found ${transactions?.length || 0} transactions for user ${userId}`);

      // Sync transactions to Google Sheets
      const accessToken = await getGoogleAccessToken(googleClientEmail, googlePrivateKey);
      const syncResult = await syncTransactionsToSheet(transactions || [], sheetId, accessToken);

      return new Response(JSON.stringify({
        success: true,
        message: 'Transactions synced successfully',
        syncedCount: syncResult.syncedCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action or missing parameters'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-employee-sheets function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  // Create JWT token for Google Service Account authentication
  const header = {
    "alg": "RS256",
    "typ": "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    "iss": clientEmail,
    "scope": "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600, // 1 hour
    "iat": now
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''})[m] || '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''})[m] || '');

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key for signing
  const keyData = privateKey.replace(/\\n/g, '\n');
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = keyData.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  
  // Convert PEM to ArrayBuffer
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''})[m] || '');
  
  const jwt = `${signatureInput}.${encodedSignature}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

async function createEmployeeSheet(userId: string, accessToken: string) {
  // Create a new Google Sheet using the Sheets API
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Финансы сотрудника ${userId.substring(0, 8)}`,
      },
      sheets: [{
        properties: {
          title: 'Транзакции',
          gridProperties: {
            rowCount: 1000,
            columnCount: 10
          }
        }
      }]
    })
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create Google Sheet: ${createResponse.statusText}`);
  }

  const sheet = await createResponse.json();
  
  // Set up headers in the sheet
  const headers = [
    'Дата', 'Проект', 'Владелец проекта', 'Описание', 
    'Сумма трат', 'Сумма прихода', 'Категория', 'Тип кэша', 'Без чека', 'Причина без чека'
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Транзакции!A1:J1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers]
    })
  });

  return {
    spreadsheetId: sheet.spreadsheetId,
    spreadsheetUrl: sheet.spreadsheetUrl
  };
}

async function syncTransactionsToSheet(transactions: any[], sheetId: string, accessToken: string) {
  const values = transactions.map(transaction => [
    transaction.operation_date,
    transaction.events?.name || '',
    transaction.project_owner,
    transaction.description,
    transaction.expense_amount || '',
    transaction.income_amount || '',
    transaction.category,
    transaction.cash_type || '',
    transaction.no_receipt ? 'Да' : 'Нет',
    transaction.no_receipt_reason || ''
  ]);

  // Clear existing data (except headers) and add new data
  if (values.length > 0) {
    const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Транзакции!A2:J?majorDimension=ROWS`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });

    if (!clearResponse.ok) {
      throw new Error(`Failed to sync data to Google Sheet: ${clearResponse.statusText}`);
    }
  }

  return {
    syncedCount: values.length
  };
}