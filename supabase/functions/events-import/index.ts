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

    console.log(`Starting import of ${rows.length} rows for user ${user_id}`);

    const result: ImportResult = {
      total: rows.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process rows in chunks of 50 to avoid timeouts
    const CHUNK_SIZE = 50;
    
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      
      for (let j = 0; j < chunk.length; j++) {
        const rowIndex = i + j;
        const row = chunk[j] as ImportRow;
        
        try {
          // Validate required fields
          if (!row.event_date || !row.title) {
            result.failed++;
            result.errors.push({
              row: rowIndex + 1,
              reason: 'Missing required fields (event_date or title)',
              data: row
            });
            continue;
          }

          // Parse and validate date
          const eventDate = new Date(row.event_date);
          if (isNaN(eventDate.getTime())) {
            result.failed++;
            result.errors.push({
              row: rowIndex + 1,
              reason: 'Invalid date format',
              data: row
            });
            continue;
          }

          // Prepare data for upsert
          const { event_time, end_time, normalized } = parseTimeRange(row.time_range);
          const eventData = {
            start_date: row.event_date,
            name: row.title.trim(),
            project_owner: row.project_owner?.trim() || null,
            managers: row.managers?.trim() || null,
            place: row.place?.trim() || null,
            location: row.place?.trim() || null, // Keep both for compatibility
            time_range: normalized ?? (row.time_range?.trim() || null),
            event_time: event_time, // normalized start time HH:mm or null
            end_time: end_time,     // normalized end time HH:mm or null
            animators: row.animators?.trim() || null,
            show_program: row.show_program?.trim() || null,
            contractors: row.contractors?.trim() || null,
            photo: row.photo?.trim() || null,
            video: row.video?.trim() || null,
            notes: row.notes?.trim() || null,
            source_event_id: row.source_event_id || null,
            created_by: user_id,
            updated_at: new Date().toISOString()
          };

          // Check if record exists
          let existingRecord = null;
          
          if (row.source_event_id) {
            // Try to find by source_event_id first
            const { data: sourceData } = await supabase
              .from('events')
              .select('id')
              .eq('source_event_id', row.source_event_id)
              .single();
            existingRecord = sourceData;
          }
          
          if (!existingRecord) {
            // Fallback to date + name lookup
            const { data: nameData } = await supabase
              .from('events')
              .select('id')
              .eq('start_date', row.event_date)
              .ilike('name', row.title.trim())
              .single();
            existingRecord = nameData;
          }

          if (existingRecord) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('events')
              .update(eventData)
              .eq('id', existingRecord.id);

            if (updateError) {
              console.error('Update error:', updateError);
              result.failed++;
              result.errors.push({
                row: rowIndex + 1,
                reason: `Update failed: ${updateError.message}`,
                data: row
              });
            } else {
              result.updated++;
            }
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('events')
              .insert(eventData);

            if (insertError) {
              console.error('Insert error:', insertError);
              result.failed++;
              result.errors.push({
                row: rowIndex + 1,
                reason: `Insert failed: ${insertError.message}`,
                data: row
              });
            } else {
              result.inserted++;
            }
          }

        } catch (rowError: any) {
          console.error(`Error processing row ${rowIndex + 1}:`, rowError);
          result.failed++;
          result.errors.push({
            row: rowIndex + 1,
            reason: rowError.message || 'Unknown error',
            data: row
          });
        }
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
        total: 0,
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});