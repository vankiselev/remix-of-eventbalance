import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transaction_id, action } = await req.json();

    if (!transaction_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing transaction_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing money transfer action: ${action} for transaction: ${transaction_id}`);

    // Get the original transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('financial_transactions')
      .select('*, sender:created_by(id, email, full_name), recipient:transfer_to_user_id(id, email, full_name)')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found:', txError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'notify') {
      // Send notification to recipient
      const { error: notifyError } = await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          user_id: transaction.transfer_to_user_id,
          title: 'Вам переведены деньги',
          message: `${transaction.sender?.full_name || 'Сотрудник'} передал вам ${transaction.expense_amount} ₽`,
          type: 'money_transfer',
          data: {
            transaction_id: transaction.id,
            from_user_name: transaction.sender?.full_name || 'Сотрудник',
            amount: transaction.expense_amount,
            cash_type: transaction.cash_type,
            description: transaction.description,
          },
        },
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accept') {
      // Verify user is the recipient
      if (transaction.transfer_to_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You are not the recipient' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (transaction.transfer_status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Transfer already processed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create income transaction for recipient
      const { data: incomeTransaction, error: incomeError } = await supabaseClient
        .from('financial_transactions')
        .insert({
          created_by: user.id,
          operation_date: new Date().toISOString().split('T')[0],
          income_amount: transaction.expense_amount,
          expense_amount: 0,
          category: 'Передано или получено от сотрудника',
          cash_type: transaction.cash_type,
          description: `Получено от ${transaction.sender?.full_name || 'сотрудника'}`,
          project_owner: transaction.project_owner || 'Не указан',
          transfer_from_user_id: transaction.created_by,
          linked_transaction_id: transaction.id,
          no_receipt: true,
          no_receipt_reason: 'Внутренняя передача денег между сотрудниками',
        })
        .select()
        .single();

      if (incomeError) {
        console.error('Error creating income transaction:', incomeError);
        return new Response(
          JSON.stringify({ error: 'Failed to create income transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update original transaction status and link
      const { error: updateError } = await supabaseClient
        .from('financial_transactions')
        .update({
          transfer_status: 'accepted',
          linked_transaction_id: incomeTransaction.id,
        })
        .eq('id', transaction_id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notification to sender
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          user_id: transaction.created_by,
          title: 'Передача денег подтверждена',
          message: `${transaction.recipient?.full_name || 'Получатель'} подтвердил получение ${transaction.expense_amount} ₽`,
          type: 'money_transfer',
          data: {
            transaction_id: transaction.id,
            status: 'accepted',
          },
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Transfer accepted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reject') {
      // Verify user is the recipient
      if (transaction.transfer_to_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You are not the recipient' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (transaction.transfer_status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Transfer already processed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update transaction status
      const { error: updateError } = await supabaseClient
        .from('financial_transactions')
        .update({ transfer_status: 'rejected' })
        .eq('id', transaction_id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notification to sender
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          user_id: transaction.created_by,
          title: 'Передача денег отклонена',
          message: `${transaction.recipient?.full_name || 'Получатель'} отклонил передачу ${transaction.expense_amount} ₽`,
          type: 'money_transfer',
          data: {
            transaction_id: transaction.id,
            status: 'rejected',
          },
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Transfer rejected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handle-money-transfer function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
