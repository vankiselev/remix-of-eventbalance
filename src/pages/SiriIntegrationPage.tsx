import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2, Key, Smartphone, MessageSquare, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SiriIntegrationPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      // Generate API key
      const { data: keyData, error: keyError } = await supabase.rpc('generate_user_api_key');
      
      if (keyError) throw keyError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Deactivate old keys
      await supabase
        .from('user_api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Insert new key
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
      toast.success("API ключ успешно создан!");
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error("Ошибка при создании API ключа");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExistingKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          throw error;
        }
        return;
      }

      if (data) {
        setApiKey(data.api_key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  useState(() => {
    loadExistingKey();
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Скопировано в буфер обмена!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const apiUrl = "https://wpxhmajdeunabximyfln.supabase.co/functions/v1/voice-transaction";

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Интеграция с Siri</h1>
          <p className="text-muted-foreground">
            Настройте голосовое добавление транзакций через Siri Shortcuts
          </p>
        </div>

        {/* Step 1: Generate API Key */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Шаг 1: Создайте API ключ
            </CardTitle>
            <CardDescription>
              API ключ необходим для безопасной аутентификации запросов от Siri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!apiKey ? (
              <Button 
                onClick={generateApiKey} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? "Создание..." : "Создать API ключ"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>Ваш API ключ:</Label>
                <div className="flex gap-2">
                  <Input 
                    value={apiKey} 
                    readOnly 
                    type="password"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey)}
                  >
                    {isCopied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Alert>
                  <AlertDescription>
                    ⚠️ Сохраните этот ключ в безопасном месте. Вы не сможете увидеть его снова.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {apiKey && (
          <>
            {/* Step 2: Setup Siri Shortcut */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Шаг 2: Настройте Siri Shortcut
                </CardTitle>
                <CardDescription>
                  Создайте команду в приложении "Команды" на iPhone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">1. Откройте приложение "Команды"</h3>
                    <p className="text-sm text-muted-foreground">
                      Встроенное приложение Apple для автоматизации
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">2. Создайте новую команду</h3>
                    <p className="text-sm text-muted-foreground">
                      Нажмите "+" и добавьте следующие действия:
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">3. Добавьте действие "Запросить ввод"</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Тип: Текст</li>
                      <li>Вопрос: "Какую транзакцию добавить?"</li>
                      <li>По умолчанию: пусто</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">4. Добавьте действие "Диктовка текста"</h3>
                    <p className="text-sm text-muted-foreground">
                      Это позволит вам надиктовывать детали транзакции
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">5. Добавьте действие "URL"</h3>
                    <div className="flex gap-2 items-center">
                      <Input 
                        value={apiUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(apiUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">6. Добавьте действие "Получить содержимое URL"</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Метод: POST</li>
                      <li>Заголовки: Content-Type = application/json</li>
                      <li>Тело запроса: JSON</li>
                    </ul>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-x-auto">
{`{
  "text": "[Результат диктовки]",
  "apiKey": "${apiKey}"
}`}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Замените [Результат диктовки] на переменную из шага диктовки
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">7. Добавьте действие "Показать результат"</h3>
                    <p className="text-sm text-muted-foreground">
                      Выберите "message" из ответа сервера
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">8. Назовите команду</h3>
                    <p className="text-sm text-muted-foreground">
                      Например: "Добавь расход" или "Внести транзакцию"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Usage Examples */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Шаг 3: Примеры использования
                </CardTitle>
                <CardDescription>
                  Как правильно формулировать команды для Siri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Расходы:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "потратил 500 рублей на такси"</li>
                      <li>• "купил продукты на тысячу"</li>
                      <li>• "заправка 2500"</li>
                      <li>• "оплатил интернет 800 рублей"</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Доходы:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "приход 5000 за мероприятие"</li>
                      <li>• "получил зарплату 50000"</li>
                      <li>• "продал товар за 3000"</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertDescription>
                      💡 Совет: Чем конкретнее вы опишете транзакцию, тем точнее AI определит категорию и детали
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-semibold">🔒 Безопасность:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Никогда не делитесь вашим API ключом с другими людьми</li>
                  <li>Если ключ скомпрометирован, создайте новый (старый автоматически деактивируется)</li>
                  <li>API ключ работает только для вашего аккаунта</li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </Layout>
  );
}
