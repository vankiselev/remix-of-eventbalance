import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceTestWidget } from "@/components/siri/VoiceTestWidget";
import { VoiceSettingsCard } from "@/components/siri/VoiceSettingsCard";
import { VoiceHistoryCard } from "@/components/siri/VoiceHistoryCard";
import { QuickSetupCard } from "@/components/siri/QuickSetupCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, BookOpen, Mic } from "lucide-react";

export default function SiriIntegrationPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [defaultWallet, setDefaultWallet] = useState("Наличка Настя");
  const [showDocs, setShowDocs] = useState(false);

  const apiUrl = "https://wpxhmajdeunabximyfln.supabase.co/functions/v1/voice-transaction";

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      const { data: keyData, error: keyError } = await supabase.rpc('generate_user_api_key');
      if (keyError) throw keyError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('user_api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          api_key: keyData,
          name: 'Siri Integration',
          is_active: true
        });

      if (insertError) throw insertError;

      setApiKey(keyData);
      toast.success("API ключ создан!");
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error("Ошибка при создании ключа");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const loadKey = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) setApiKey(data.api_key);
    };
    loadKey();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Голосовой ввод</h1>
              <p className="text-muted-foreground">Добавляйте транзакции через Siri или браузер</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Voice Test Widget - Main Focus */}
          {apiKey && (
            <VoiceTestWidget 
              apiKey={apiKey} 
              defaultWallet={defaultWallet}
              onTransactionCreated={() => {
                // Could trigger a refetch of history
              }}
            />
          )}

          {/* Settings & Setup Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <VoiceSettingsCard onSettingsChange={setDefaultWallet} />
            <QuickSetupCard 
              apiKey={apiKey}
              apiUrl={apiUrl}
              onGenerateKey={generateApiKey}
              isGenerating={isGenerating}
            />
          </div>

          {/* History */}
          <VoiceHistoryCard />

          {/* Documentation - Collapsed by Default */}
          <Collapsible open={showDocs} onOpenChange={setShowDocs}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      <CardTitle className="text-lg">Документация</CardTitle>
                      <Badge variant="secondary">Для разработчиков</Badge>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showDocs ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription>Подробная техническая документация API</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-semibold">Простой режим (mode: "simple")</h4>
                    <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`POST ${apiUrl}
{
  "text": "Такси 500 рублей",
  "apiKey": "sk_xxx...",
  "mode": "simple"
}`}
                    </pre>
                    <p className="text-sm text-muted-foreground">
                      Транзакция создаётся автоматически с вашими настройками по умолчанию.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-semibold">Многошаговый режим (step: 1, 2, 3)</h4>
                    <p className="text-sm text-muted-foreground">
                      Используйте для интерактивного выбора проекта и кошелька через Siri.
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>step: 1</strong> — парсинг суммы и описания</li>
                      <li><strong>step: 2</strong> — поиск проекта по названию</li>
                      <li><strong>step: 3</strong> — создание транзакции</li>
                    </ul>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </Layout>
  );
}
