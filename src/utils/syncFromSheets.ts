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
  // Логирование для диагностики
  console.log("ENV проверка:", {
    supabaseUrl: "https://wpxhmajdeunabximyfln.supabase.co",
    hasAnonKey: true, // Скрываем ключ из логов
    month,
    rangeBase: "A1:L"
  });

  try {
    const { data, error } = await supabase.functions.invoke("gsheets_read", {
      body: {
        month,            // имя вкладки в Google Sheets
        rangeBase: "A1:L" // диапазон, который нужно читать
      }
    });

    console.log("Supabase response:", { data, error });

    if (error) {
      console.error("Supabase error:", error);
      
      // Более детальная обработка ошибок
      if (error.message?.includes("Failed to send")) {
        throw new Error("Ошибка сети: не удалось отправить запрос к Edge Function. Проверьте настройки функции gsheets_read в Supabase.");
      }
      
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        throw new Error("Функция gsheets_read не найдена. Убедитесь, что она развернута в Supabase.");
      }
      
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        throw new Error("Ошибка авторизации: включите 'Verify JWT = Off' для функции gsheets_read.");
      }

      const detail = (data && (data as any).error) ? (data as any).error : error.message;
      throw new Error(`Ошибка вызова функции: ${detail}`);
    }

    if (!data) {
      throw new Error("Функция не вернула данные");
    }

    if (!data.ok) {
      throw new Error(data.error || "Функция вернула ошибку");
    }

    console.log("Синхронизация успешна:", data);
    return data;
  } catch (err: any) {
    console.error("Sync error:", err);
    
    // Если это уже наша обработанная ошибка, пробросим её
    if (err.message?.includes("Ошибка")) {
      throw err;
    }
    
    // Для неизвестных ошибок
    throw new Error(`Неизвестная ошибка синхронизации: ${err.message}`);
  }
}

// Функция для проверки доступности Edge Function (для отладки)
export async function testEdgeFunctionConnection(): Promise<void> {
  const projectRef = "wpxhmajdeunabximyfln";
  const url = `https://${projectRef}.functions.supabase.co/gsheets_read`;
  
  try {
    console.log("Тестируем прямой вызов:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweGhtYWpkZXVuYWJ4aW15ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTM1MTEsImV4cCI6MjA3MTA4OTUxMX0.urAxl_XVwNggHZ1SuwlFFRzuRJSOHAHW038S57YDFzk"
      },
      body: JSON.stringify({ month: "Сентябрь", rangeBase: "A1:L" })
    });
    
    const text = await response.text();
    console.log("Прямой вызов - статус:", response.status, "ответ:", text);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
  } catch (err: any) {
    console.error("Тест прямого вызова failed:", err);
    throw new Error(`Прямой вызов failed: ${err.message}`);
  }
}