import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Settings, FolderOpen, FileSpreadsheet } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  google_sheet_id: string | null;
  google_sheet_url: string | null;
  google_drive_folder_id: string | null;
  google_drive_folder_url: string | null;
}

export function GoogleIntegrationSettings() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_admin_profiles');

      if (error) throw error;
      
      // Filter out admins and map to Employee interface
      const employeeData: Employee[] = (data || [])
        .filter((profile: any) => profile.role !== 'admin')
        .map((profile: any) => ({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          google_sheet_id: profile.google_sheet_id || null,
          google_sheet_url: profile.google_sheet_url || null,
          google_drive_folder_id: profile.google_drive_folder_id || null,
          google_drive_folder_url: profile.google_drive_folder_url || null,
        }));
      
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить список сотрудников",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupGoogleSheet = async (employeeId: string, employeeName: string) => {
    setSetupLoading(employeeId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-employee-sheets', {
        body: {
          userId: employeeId,
          action: 'setup'
        }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Google Таблица создана для ${employeeName}`,
      });

      // Refresh the list
      await fetchEmployees();
    } catch (error) {
      console.error('Error setting up Google Sheet:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось создать Google Таблицу",
      });
    } finally {
      setSetupLoading(null);
    }
  };

  const setupDriveFolder = async (employeeId: string, employeeName: string) => {
    setSetupLoading(employeeId);
    try {
      const { data, error } = await supabase.functions.invoke('setup-employee-drive', {
        body: {
          userId: employeeId,
          folderName: `Чеки - ${employeeName}`
        }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Google Drive папка создана для ${employeeName}`,
      });

      // Refresh the list
      await fetchEmployees();
    } catch (error) {
      console.error('Error setting up Drive folder:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось создать Google Drive папку",
      });
    } finally {
      setSetupLoading(null);
    }
  };

  const syncEmployeeData = async (employeeId: string, employeeName: string, sheetId: string) => {
    setSetupLoading(employeeId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-employee-sheets', {
        body: {
          userId: employeeId,
          sheetId: sheetId,
          action: 'sync'
        }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Данные синхронизированы для ${employeeName}`,
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось синхронизировать данные",
      });
    } finally {
      setSetupLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройка Google интеграции
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-20 w-full rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Настройка Google интеграции
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((employee) => (
            <Card key={employee.id} className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{employee.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {employee.google_sheet_url ? (
                          <a 
                            href={employee.google_sheet_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Таблица настроена <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">Таблица не настроена</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {employee.google_drive_folder_url ? (
                          <a 
                            href={employee.google_drive_folder_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Папка настроена <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">Папка не настроена</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-col">
                    {!employee.google_sheet_id ? (
                      <Button
                        size="sm"
                        onClick={() => setupGoogleSheet(employee.id, employee.full_name)}
                        disabled={setupLoading === employee.id}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        {setupLoading === employee.id ? 'Создание...' : 'Создать таблицу'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncEmployeeData(employee.id, employee.full_name, employee.google_sheet_id!)}
                        disabled={setupLoading === employee.id}
                      >
                        {setupLoading === employee.id ? 'Синхронизация...' : 'Синхронизировать'}
                      </Button>
                    )}
                    
                    {!employee.google_drive_folder_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setupDriveFolder(employee.id, employee.full_name)}
                        disabled={setupLoading === employee.id}
                        className="flex items-center gap-2"
                      >
                        <FolderOpen className="h-4 w-4" />
                        {setupLoading === employee.id ? 'Создание...' : 'Создать папку'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}