import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  event_date: string;
  title: string;
  project_owner?: string;
  managers?: string;
  place?: string;
  time_range?: string;
  animators?: string;
  show_program?: string;
  contractors?: string;
  photo?: string;
  video?: string;
  notes?: string;
  source_event_id?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}

serve(async (req) => {
  // --- Time parsing helpers ---
  function pad2(n: number) { return n.toString().padStart(2, '0'); }
  function toHM(hours: number, minutes: number) {
    const h = Math.max(0, Math.min(23, Math.floor(hours)));
    const m = Math.max(0, Math.min(59, Math.round(minutes)));
    return `${pad2(h)}:${pad2(m)}`;
  }

  function parseSingleTime(raw?: string | number | null): string | null {
    if (raw === null || raw === undefined) return null;
    let s = typeof raw === 'number' ? String(raw) : String(raw).trim();
    if (s === '') return null;
    s = s.replace(/,/g, '.');

    // Pure number (decimal or integer)
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      if (!isFinite(num)) return null;
      // If looks like hour with optional minutes in decimal (e.g., 16, 16.5)
      if (num >= 0 && num < 24) {
        const h = Math.floor(num);
        const m = (num - h) * 60;
        return toHM(h, m);
      }
      // Excel serial date/time -> use fractional part for time
      const frac = num % 1;
      if (frac > 0) {
        const totalHours = frac * 24;
        const h = Math.floor(totalHours);
        const m = (totalHours - h) * 60;
        return toHM(h, m);
      }
      return null; // integer day number without time -> ignore
    }

    // HH or H
    if (/^\d{1,2}$/.test(s)) {
      const h = parseInt(s, 10);
      if (h >= 0 && h < 24) return toHM(h, 0);
    }

    // HH:MM or HH.MM
    const m1 = s.match(/^(\d{1,2})[:.](\d{1,2})$/);
    if (m1) {
      const h = parseInt(m1[1], 10);
      const min = parseInt(m1[2], 10);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return toHM(h, min);
    }

    // HHMM (e.g., 1630)
    const m2 = s.match(/^(\d{1,2})(\d{2})$/);
    if (m2) {
      const h = parseInt(m2[1], 10);
      const min = parseInt(m2[2], 10);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return toHM(h, min);
    }

    return null;
  }

  function parseTimeRange(input?: string | number | null): { event_time: string | null; end_time: string | null; normalized: string | null } {
    if (input === null || input === undefined) return { event_time: null, end_time: null, normalized: null };
    let s = typeof input === 'number' ? String(input) : String(input).trim();
    if (!s) return { event_time: null, end_time: null, normalized: null };
    s = s.replace(/,/g, '.');

    const sepMatch = s.match(/(.+?)[–-](.+)/); // hyphen or en dash
    if (sepMatch) {
      const startRaw = sepMatch[1].trim();
      const endRaw = sepMatch[2].trim();
      const start = parseSingleTime(startRaw);
      const end = parseSingleTime(endRaw);
      const normalized = start && end ? `${start}-${end}` : start ? start : null;
      return { event_time: start, end_time: end, normalized };
    }

    const single = parseSingleTime(s);
    return { event_time: single, end_time: null, normalized: single };
  }
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { rows, user_id } = await req.json();
    
    if (!rows || !Array.isArray(rows)) {
      throw new Error('Invalid rows data');
    }

    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Get user's tenant_id
    let tenantId: string | null = null;
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user_id)
      .limit(1)
      .single();
    if (membership) tenantId = membership.tenant_id;

    console.log(`Starting import of ${rows.length} rows for user ${user_id}, tenant ${tenantId}`);

    const result: ImportResult = {
      total: rows.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ImportRow;
      
      try {
        if (!row.event_date || !row.title) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            reason: 'Missing required fields (event_date or title)',
            data: row
          });
          continue;
        }

        const eventDate = new Date(row.event_date);
        if (isNaN(eventDate.getTime())) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            reason: `Invalid date format: ${row.event_date}`,
            data: row
          });
          continue;
        }

        const dateStr = eventDate.toISOString().split('T')[0];
        const { event_time, end_time } = parseTimeRange(row.time_range);
        
        // Combine photo + video into photo_video field
        const photoVideo = [row.photo, row.video].filter(Boolean).join(', ').trim() || null;

        // Only use columns that exist in the events table
        const eventData: Record<string, any> = {
          start_date: dateStr,
          name: row.title.trim(),
          project_owner: row.project_owner?.trim() || null,
          managers: row.managers?.trim() || null,
          location: row.place?.trim() || null,
          event_time: event_time,
          end_time: end_time,
          animators: row.animators?.trim() || null,
          show_program: row.show_program?.trim() || null,
          contractors: row.contractors?.trim() || null,
          photo_video: photoVideo,
          notes: row.notes?.trim() || null,
          created_by: user_id,
          updated_at: new Date().toISOString()
        };

        if (tenantId) {
          eventData.tenant_id = tenantId;
        }

        // Check if record exists by date + name
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('start_date', dateStr)
          .ilike('name', row.title.trim())
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabase
            .from('events')
            .update(eventData)
            .eq('id', existing.id);

          if (updateError) {
            console.error('Update error:', updateError);
            result.failed++;
            result.errors.push({ row: i + 1, reason: `Update failed: ${updateError.message}`, data: row });
          } else {
            result.updated++;
          }
        } else {
          const { error: insertError } = await supabase
            .from('events')
            .insert(eventData);

          if (insertError) {
            console.error('Insert error:', insertError);
            result.failed++;
            result.errors.push({ row: i + 1, reason: `Insert failed: ${insertError.message}`, data: row });
          } else {
            result.inserted++;
          }
        }

      } catch (rowError: any) {
        console.error(`Error processing row ${i + 1}:`, rowError);
        result.failed++;
        result.errors.push({ row: i + 1, reason: rowError.message || 'Unknown error', data: row });
      }
    }

    console.log('Import completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        total: 0, inserted: 0, updated: 0, failed: 0, errors: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});