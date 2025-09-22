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
    const googleApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody: SyncRequest = await req.json();
    const { userId, sheetId, action } = requestBody;

    console.log('Request data:', { userId, sheetId, action });

    if (action === 'setup') {
      // Create a new Google Sheet for the employee
      const newSheetResponse = await createEmployeeSheet(userId, googleApiKey);
      
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
      const syncResult = await syncTransactionsToSheet(transactions || [], sheetId, googleApiKey);

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

async function createEmployeeSheet(userId: string, apiKey: string) {
  // Create a new Google Sheet using the Sheets API
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
      'Authorization': `Bearer ${apiKey}`,
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

async function syncTransactionsToSheet(transactions: any[], sheetId: string, apiKey: string) {
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
        'Authorization': `Bearer ${apiKey}`,
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