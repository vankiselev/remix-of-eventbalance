import { supabase } from "@/integrations/supabase/client";

interface SyncItem {
  date: string;
  title: string;
  start: string;
  end: string;
  place: string;
  notes: string;
}

interface SyncResponse {
  ok: boolean;
  count: number;
  items: SyncItem[];
  error?: string;
}

export async function syncFromSheets(month = "Сентябрь"): Promise<SyncResponse> {
  const { data, error } = await supabase.functions.invoke("gsheets_read", {
    body: {
      month,            // имя вкладки в Google Sheets
      rangeBase: "A1:L" // диапазон, который нужно читать
      // при необходимости можно добавить map: { date:0, title:1, start:2, end:3, place:4, notes:5 }
    }
  });

  if (error) {
    const detail = (data && (data as any).error) ? (data as any).error : error.message;
    throw new Error(detail);
  }
  if (!data?.ok) throw new Error(data?.error || "Unknown error");
  return data; // вернёт { ok, count, items }
}