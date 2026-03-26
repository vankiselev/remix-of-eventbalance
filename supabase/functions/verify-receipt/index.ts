import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getSystemSecrets } from "../_shared/secrets.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// ФНС Open API Receipt Verification - Backend Adapter
// ============================================================
// 
// This edge function handles receipt verification through the
// official ФНС Russia "Открытое API проверки чека ККТ".
//
// INTEGRATION FLOW:
// 1. Authenticate with ФНС Auth Service using Master Token → get Temporary Token
// 2. Send CheckTicket SOAP request to verify receipt existence
// 3. Poll for async result via GetMessage
// 4. If found, send GetTicket to get full receipt details
// 5. Store result in receipt_verifications table
//
// REQUIRED SECRETS (in system_secrets table):
// - FNS_MASTER_TOKEN: Master token from ФНС registration
// - FNS_AUTH_URL: Authentication service URL (provided by ФНС)
// - FNS_SERVICE_URL: KKT service URL (provided by ФНС)
//
// REGISTRATION:
// Submit application at https://kkt-online.nalog.ru/
// ФНС provides: master token, auth URL, service URL, daily request limit
// IP address whitelist required
// ============================================================

interface ReceiptData {
  fn: string;       // Фискальный накопитель
  fd: string;       // Фискальный документ
  fp: string;       // Фискальный признак
  date: string;     // ISO date
  sum: number;      // Сумма в копейках или рублях
  operationType: number; // 1-4
}

interface VerifyRequest {
  transactionId: string;
  receipt: ReceiptData;
  tenantId: string;
}

// ============================================================
// ФНС SOAP Client - ADAPTER LAYER
// Replace implementations when real credentials are available
// ============================================================

class FnsApiClient {
  private masterToken: string;
  private authUrl: string;
  private serviceUrl: string;
  private tempToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(masterToken: string, authUrl: string, serviceUrl: string) {
    this.masterToken = masterToken;
    this.authUrl = authUrl;
    this.serviceUrl = serviceUrl;
  }

  /**
   * Step 1: Authenticate with ФНС Auth Service
   * Sends SOAP request with Master Token, receives Temporary Token
   * 
   * SOAP Schema: AuthService-types-v0.1.xsd
   * The temp token is valid for a limited time (specified by ФНС)
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tempToken && Date.now() < this.tokenExpiresAt) {
      return this.tempToken;
    }

    console.log('[FNS] Authenticating with ФНС Auth Service...');

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:dreamkas:fns:auth:v0.1">
  <soap:Body>
    <ns:GetTokenRequest>
      <ns:MasterToken>${this.masterToken}</ns:MasterToken>
    </ns:GetTokenRequest>
  </soap:Body>
</soap:Envelope>`;

    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:GetToken',
        },
        body: soapBody,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Auth failed [${response.status}]: ${text}`);
      }

      const xml = await response.text();
      
      // Parse temp token from SOAP response
      // Expected: <ns:Token>TEMPORARY_TOKEN</ns:Token>
      const tokenMatch = xml.match(/<(?:\w+:)?Token>([^<]+)<\/(?:\w+:)?Token>/);
      if (!tokenMatch) {
        throw new Error('Failed to parse token from ФНС auth response');
      }

      this.tempToken = tokenMatch[1];
      // Cache token for 50 minutes (ФНС tokens typically valid 1 hour)
      this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;

      console.log('[FNS] Authentication successful');
      return this.tempToken;
    } catch (error) {
      console.error('[FNS] Authentication error:', error);
      throw new Error(`ФНС authentication failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Check if receipt exists in ФНС database
   * 
   * SOAP Schema: KktService-types-v0.1.xsd
   * Returns MessageId for async polling
   */
  async checkTicket(receipt: ReceiptData): Promise<string> {
    const token = await this.authenticate();

    console.log('[FNS] Sending CheckTicket request...');

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:dreamkas:fns:kkt:v0.1">
  <soap:Body>
    <ns:CheckTicketRequest>
      <ns:Fn>${receipt.fn}</ns:Fn>
      <ns:Fd>${receipt.fd}</ns:Fd>
      <ns:Fp>${receipt.fp}</ns:Fp>
      <ns:Date>${receipt.date}</ns:Date>
      <ns:Sum>${receipt.sum}</ns:Sum>
      <ns:OperationType>${receipt.operationType}</ns:OperationType>
    </ns:CheckTicketRequest>
  </soap:Body>
</soap:Envelope>`;

    try {
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:CheckTicket',
          'FNS-OpenApi-Token': token,
        },
        body: soapBody,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`CheckTicket failed [${response.status}]: ${text}`);
      }

      const xml = await response.text();
      
      // Parse MessageId from async response
      const messageIdMatch = xml.match(/<(?:\w+:)?MessageId>([^<]+)<\/(?:\w+:)?MessageId>/);
      if (!messageIdMatch) {
        // Check for direct result (some implementations return synchronous result)
        const codeMatch = xml.match(/<(?:\w+:)?Code>(\d+)<\/(?:\w+:)?Code>/);
        if (codeMatch) {
          return `SYNC:${codeMatch[1]}`;
        }
        throw new Error('Failed to parse MessageId from CheckTicket response');
      }

      console.log('[FNS] CheckTicket submitted, messageId:', messageIdMatch[1]);
      return messageIdMatch[1];
    } catch (error) {
      console.error('[FNS] CheckTicket error:', error);
      throw error;
    }
  }

  /**
   * Step 3: Poll for async result
   * ФНС processes requests asynchronously
   */
  async getMessage(messageId: string): Promise<{ code: number; ticket?: any }> {
    // Handle synchronous result
    if (messageId.startsWith('SYNC:')) {
      const code = parseInt(messageId.replace('SYNC:', ''));
      return { code };
    }

    const token = await this.authenticate();

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:dreamkas:fns:kkt:v0.1">
  <soap:Body>
    <ns:GetMessageRequest>
      <ns:MessageId>${messageId}</ns:MessageId>
    </ns:GetMessageRequest>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(this.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'urn:GetMessage',
        'FNS-OpenApi-Token': token,
      },
      body: soapBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GetMessage failed [${response.status}]: ${text}`);
    }

    const xml = await response.text();
    const codeMatch = xml.match(/<(?:\w+:)?Code>(\d+)<\/(?:\w+:)?Code>/);
    const code = codeMatch ? parseInt(codeMatch[1]) : -1;

    return { code, ticket: xml };
  }

  /**
   * Step 4: Get full ticket details
   */
  async getTicket(receipt: ReceiptData): Promise<any> {
    const token = await this.authenticate();

    console.log('[FNS] Sending GetTicket request...');

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:dreamkas:fns:kkt:v0.1">
  <soap:Body>
    <ns:GetTicketRequest>
      <ns:Fn>${receipt.fn}</ns:Fn>
      <ns:Fd>${receipt.fd}</ns:Fd>
      <ns:Fp>${receipt.fp}</ns:Fp>
      <ns:Date>${receipt.date}</ns:Date>
      <ns:Sum>${receipt.sum}</ns:Sum>
      <ns:OperationType>${receipt.operationType}</ns:OperationType>
    </ns:GetTicketRequest>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(this.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'urn:GetTicket',
        'FNS-OpenApi-Token': token,
      },
      body: soapBody,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GetTicket failed [${response.status}]: ${text}`);
    }

    return await response.text();
  }
}

// ============================================================
// Main Handler
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    // Parse request
    const body: VerifyRequest = await req.json();
    const { transactionId, receipt, tenantId } = body;

    if (!transactionId || !receipt?.fn || !receipt?.fd || !receipt?.fp) {
      return new Response(JSON.stringify({ error: 'Missing required receipt data (fn, fd, fp)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to "verifying"
    const { data: verification, error: upsertError } = await supabase
      .from('receipt_verifications')
      .upsert({
        transaction_id: transactionId,
        fn: receipt.fn,
        fd: receipt.fd,
        fp: receipt.fp,
        receipt_date: receipt.date || null,
        receipt_sum: receipt.sum || null,
        operation_type: receipt.operationType || 1,
        status: 'verifying',
        created_by: userId,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'transaction_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    // If upsert fails (no unique constraint on transaction_id), use insert
    if (upsertError) {
      // Check if record exists
      const { data: existing } = await supabase
        .from('receipt_verifications')
        .select('id')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('receipt_verifications')
          .update({
            fn: receipt.fn,
            fd: receipt.fd,
            fp: receipt.fp,
            receipt_date: receipt.date || null,
            receipt_sum: receipt.sum || null,
            operation_type: receipt.operationType || 1,
            status: 'verifying',
            updated_at: new Date().toISOString(),
            retry_count: 0,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('receipt_verifications')
          .insert({
            transaction_id: transactionId,
            fn: receipt.fn,
            fd: receipt.fd,
            fp: receipt.fp,
            receipt_date: receipt.date || null,
            receipt_sum: receipt.sum || null,
            operation_type: receipt.operationType || 1,
            status: 'verifying',
            created_by: userId,
            tenant_id: tenantId,
          });
      }
    }

    // ============================================================
    // ФНС API Call
    // ============================================================
    // Fetch ФНС credentials from system_secrets
    const secrets = await getSystemSecrets([
      'FNS_MASTER_TOKEN',
      'FNS_AUTH_URL', 
      'FNS_SERVICE_URL',
    ]);

    const masterToken = secrets['FNS_MASTER_TOKEN'];
    const authUrl = secrets['FNS_AUTH_URL'];
    const serviceUrl = secrets['FNS_SERVICE_URL'];

    if (!masterToken || !authUrl || !serviceUrl) {
      // ФНС credentials not configured yet - mark as needing manual review
      console.warn('[verify-receipt] ФНС credentials not configured. Marking for manual review.');
      
      const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await serviceClient
        .from('receipt_verifications')
        .update({
          status: 'service_error',
          fns_error_message: 'ФНС API credentials not configured. Contact administrator.',
          needs_manual_review: true,
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      return new Response(JSON.stringify({
        success: false,
        status: 'service_error',
        message: 'Сервис проверки ФНС не настроен. Обратитесь к администратору.',
        configurationRequired: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize ФНС client and verify receipt
    const fnsClient = new FnsApiClient(masterToken, authUrl, serviceUrl);
    let finalStatus = 'service_error';
    let fnsResponse: any = null;
    let fnsErrorCode: string | null = null;
    let fnsErrorMessage: string | null = null;

    try {
      // Step 1: Check ticket existence
      const messageId = await fnsClient.checkTicket(receipt);
      
      // Step 2: Poll for result (with retries)
      let result: { code: number; ticket?: any } | null = null;
      const maxPolls = 5;
      for (let i = 0; i < maxPolls; i++) {
        // Wait before polling (ФНС processes async)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        result = await fnsClient.getMessage(messageId);
        if (result.code !== 0) break; // 0 = still processing
      }

      if (!result || result.code === 0) {
        // Still processing after max polls
        finalStatus = 'verifying';
        fnsErrorMessage = 'ФНС processing, retry later';
      } else if (result.code === 1) {
        // Receipt found!
        // Try to get full ticket details
        try {
          const ticketDetails = await fnsClient.getTicket(receipt);
          fnsResponse = { checkResult: result, ticketDetails };
          finalStatus = 'verified_fns';
        } catch {
          // Check passed but details unavailable
          fnsResponse = { checkResult: result };
          finalStatus = 'verified_fns';
        }
      } else if (result.code === 2) {
        // Receipt not found
        finalStatus = 'not_found_fns';
        fnsErrorCode = '2';
        fnsErrorMessage = 'Чек не найден в базе ФНС';
      } else {
        // Other error code
        finalStatus = 'service_error';
        fnsErrorCode = String(result.code);
        fnsErrorMessage = `ФНС returned code: ${result.code}`;
      }
    } catch (error) {
      console.error('[verify-receipt] ФНС API error:', error);
      finalStatus = 'service_error';
      fnsErrorMessage = error.message || 'Unknown ФНС API error';
    }

    // Update verification record with result
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await serviceClient
      .from('receipt_verifications')
      .update({
        status: finalStatus,
        fns_response: fnsResponse,
        fns_error_code: fnsErrorCode,
        fns_error_message: fnsErrorMessage,
        verified_at: finalStatus === 'verified_fns' ? new Date().toISOString() : null,
        needs_manual_review: finalStatus === 'not_found_fns' || finalStatus === 'service_error',
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId);

    // Log to audit
    await supabase
      .from('financial_audit_log')
      .insert({
        transaction_id: transactionId,
        user_id: userId,
        action: 'receipt_verification',
        changes: {
          status: finalStatus,
          fn: receipt.fn,
          fd: receipt.fd,
          error: fnsErrorMessage,
        },
      });

    const statusMessages: Record<string, string> = {
      'verified_fns': 'Чек подтверждён ФНС',
      'not_found_fns': 'Чек не найден в базе ФНС',
      'service_error': 'Ошибка сервиса ФНС',
      'verifying': 'Проверка в процессе, попробуйте позже',
    };

    return new Response(JSON.stringify({
      success: finalStatus === 'verified_fns',
      status: finalStatus,
      message: statusMessages[finalStatus] || 'Неизвестный статус',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[verify-receipt] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
