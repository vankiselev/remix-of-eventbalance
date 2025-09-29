import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  sheetId: string;
  month: string;
  year: number;
}

interface EventData {
  date: string;
  holiday: string;
  project_owner: string;
  managers: string;
  place: string;
  time: string;
  animators: string;
  show_program: string;
  contractors: string;
  photo_video: string;
  notes: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { sheetId, month, year }: SyncRequest = await req.json()

    if (!sheetId || !month || !year) {
      throw new Error('Missing required parameters: sheetId, month, year')
    }

    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    if (!apiKey) {
      throw new Error('Google Sheets API key not configured')
    }

    console.log(`Starting sync for ${month} ${year} from sheet ${sheetId}`)

    // Fetch data from Google Sheets
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${month}!A:K?key=${apiKey}`
    const response = await fetch(sheetUrl)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Sheets API error:', errorText)
      throw new Error(`Failed to fetch data from Google Sheets: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const rows = data.values || []
    
    if (rows.length <= 1) {
      console.log('No data rows found in the sheet')
      throw new Error('No data found in the specified sheet tab')
    }

    // Skip header row
    const dataRows = rows.slice(1)
    console.log(`Processing ${dataRows.length} rows from Google Sheets`)

    let createdCount = 0
    let updatedCount = 0
    let archivedCount = 0

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Process each row
    const processedEvents = new Set<string>()
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row[0] || !row[1]) continue // Skip empty rows

      const eventData: EventData = {
        date: row[0] || '',
        holiday: row[1] || '',
        project_owner: row[2] || '',
        managers: row[3] || '',
        place: row[4] || '',
        time: row[5] || '',
        animators: row[6] || '',
        show_program: row[7] || '',
        contractors: row[8] || '',
        photo_video: row[9] || '',
        notes: row[10] || '',
      }

      // Parse date
      let eventDate: string
      try {
        if (eventData.date.includes('.')) {
          // Handle DD.MM.YYYY format
          const [day, month, yearPart] = eventData.date.split('.')
          eventDate = `${yearPart}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else if (eventData.date.includes('/')) {
          // Handle MM/DD/YYYY format
          const [month, day, yearPart] = eventData.date.split('/')
          eventDate = `${yearPart}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else {
          // Assume YYYY-MM-DD format
          eventDate = eventData.date
        }
      } catch (error) {
        console.error(`Error parsing date ${eventData.date}:`, error)
        continue
      }

      const uniqueKey = `${eventDate}-${eventData.holiday}`
      processedEvents.add(uniqueKey)

      // Check if event exists
      const { data: existingEvent } = await supabaseClient
        .from('events')
        .select('*')
        .eq('start_date', eventDate)
        .eq('holiday', eventData.holiday)
        .eq('is_archived', false)
        .maybeSingle()

      if (existingEvent) {
        // Update existing event
        const { error } = await supabaseClient
          .from('events')
          .update({
            name: eventData.holiday,
            holiday: eventData.holiday,
            project_owner: eventData.project_owner,
            managers: eventData.managers,
            location: eventData.place,
            event_time: eventData.time,
            animators: eventData.animators,
            show_program: eventData.show_program,
            contractors: eventData.contractors,
            photo_video: eventData.photo_video,
            notes: eventData.notes,
            google_sheets_row_id: `${sheetId}-${month}-${i + 2}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEvent.id)

        if (error) {
          console.error('Error updating event:', error)
        } else {
          updatedCount++
          console.log(`Updated event: ${eventData.holiday} on ${eventDate}`)
        }
      } else {
        // Create new event
        const { error } = await supabaseClient
          .from('events')
          .insert({
            name: eventData.holiday,
            holiday: eventData.holiday,
            start_date: eventDate,
            project_owner: eventData.project_owner,
            managers: eventData.managers,
            location: eventData.place,
            event_time: eventData.time,
            animators: eventData.animators,
            show_program: eventData.show_program,
            contractors: eventData.contractors,
            photo_video: eventData.photo_video,
            notes: eventData.notes,
            google_sheets_row_id: `${sheetId}-${month}-${i + 2}`,
            status: 'planning',
            created_by: user.id,
            is_archived: false
          })

        if (error) {
          console.error('Error creating event:', error)
        } else {
          createdCount++
          console.log(`Created event: ${eventData.holiday} on ${eventDate}`)
        }
      }
    }

    // Archive events that are no longer in the sheet
    const monthStart = `${year}-${String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0')}-31`

    const { data: currentEvents } = await supabaseClient
      .from('events')
      .select('*')
      .gte('start_date', monthStart)
      .lte('start_date', monthEnd)
      .eq('is_archived', false)

    if (currentEvents) {
      for (const event of currentEvents) {
        const uniqueKey = `${event.start_date}-${event.holiday}`
        if (!processedEvents.has(uniqueKey) && event.holiday) {
          // Archive event that's no longer in the sheet
          const { error } = await supabaseClient
            .from('events')
            .update({ is_archived: true })
            .eq('id', event.id)

          if (!error) {
            archivedCount++
            console.log(`Archived event: ${event.holiday} on ${event.start_date}`)
          }
        }
      }
    }

    // Save sync status
    await supabaseClient
      .from('sync_status')
      .insert({
        sync_month: month,
        sync_year: year,
        created_count: createdCount,
        updated_count: updatedCount,
        archived_count: archivedCount,
        sync_status: 'success'
      })

    console.log(`Sync completed: ${createdCount} created, ${updatedCount} updated, ${archivedCount} archived`)

    return new Response(
      JSON.stringify({
        success: true,
        created: createdCount,
        updated: updatedCount,
        archived: archivedCount,
        message: `Синхронизация завершена: создано ${createdCount}, обновлено ${updatedCount}, архивировано ${archivedCount}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Sync error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})