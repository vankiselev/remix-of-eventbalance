import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, RefreshCw, FileSpreadsheet, FolderOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleIntegrationInfo {
  google_sheet_id: string | null;
  google_sheet_url: string | null;
  google_drive_folder_id: string | null;
  google_drive_folder_url: string | null;
}

export function EmployeeGoogleIntegration() {
  const [integrationInfo, setIntegrationInfo] = useState<GoogleIntegrationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchIntegrationInfo();
    }
  }, [user]);

  const fetchIntegrationInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('google_sheet_id, google_sheet_url, google_drive_folder_id, google_drive_folder_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIntegrationInfo(data);
    } catch (error) {
      console.error('Error fetching integration info:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!user || !integrationInfo?.google_sheet_id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-employee-sheets', {
        body: {
          userId: user.id,
          sheetId: integrationInfo.google_sheet_id,
          action: 'sync'
        }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Данные синхронизированы с Google Таблицами",
      });
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось синхронизировать данные",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="bg-muted h-4 w-3/4 rounded mb-2"></div>
            <div className="bg-muted h-4 w-1/2 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!integrationInfo?.google_sheet_id && !integrationInfo?.google_drive_folder_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Google интеграция</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Интеграция с Google не настроена. Обратитесь к администратору.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Google интеграция
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {integrationInfo?.google_sheet_url && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="text-sm">Google Таблица</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={integrationInfo.google_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Открыть <ExternalLink className="h-3 w-3" />
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={syncToGoogleSheets}
                disabled={syncing}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Синхронизация...' : 'Синхронизировать'}
              </Button>
            </div>
          </div>
        )}

        {integrationInfo?.google_drive_folder_url && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Google Drive папка</span>
            </div>
            <a
              href={integrationInfo.google_drive_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Открыть <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Все ваши транзакции автоматически синхронизируются с Google Таблицами
          </p>
        </div>
      </CardContent>
    </Card>
  );
}