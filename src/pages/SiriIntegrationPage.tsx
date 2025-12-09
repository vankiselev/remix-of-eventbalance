import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2, Key, Smartphone, MessageSquare, Mic, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WALLET_TYPES = [
  { name: 'Наличка Настя', voice: 'наличка настя, наличные настя, кэш настя' },
  { name: 'Наличка Лера', voice: 'наличка лера, наличные лера, кэш лера' },
  { name: 'Наличка Ваня', voice: 'наличка ваня, наличные ваня, кэш ваня' },
  { name: 'Корп. карта Настя', voice: 'корп карта настя, карта настя' },
  { name: 'Корп. карта Лера', voice: 'корп карта лера, карта лера' },
  { name: 'Корп. карта Ваня', voice: 'корп карта ваня, карта ваня' },
  { name: 'ИП Настя', voice: 'ип настя' },
  { name: 'ИП Лера', voice: 'ип лера' },
  { name: 'ИП Ваня', voice: 'ип ваня' },
  { name: 'ООО Настя', voice: 'ооо настя, компания настя' },
  { name: 'ООО Лера', voice: 'ооо лера, компания лера' },
  { name: 'ООО Ваня', voice: 'ооо ваня, компания ваня' },
  { name: 'Своя Настя', voice: 'своя настя, личная настя' },
  { name: 'Своя Лера', voice: 'своя лера, личная лера' },
  { name: 'Своя Ваня', voice: 'своя ваня, личная ваня' },
];

export default function SiriIntegrationPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setApiKey(data.api_key);
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  useEffect(() => {
    loadExistingKey();
  }, []);

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
            Настройте голосовое добавление транзакций через Siri Shortcuts с пошаговым диалогом
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
                    {isCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
            {/* Wallet Types Reference */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Справочник кошельков
                </CardTitle>
                <CardDescription>
                  Полный список кошельков и как их называть голосом
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {WALLET_TYPES.map((wallet) => (
                    <div key={wallet.name} className="p-2 bg-muted rounded-md">
                      <p className="font-medium text-sm">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">{wallet.voice}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Setup Siri Shortcut */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Шаг 2: Настройте Siri Shortcut (пошаговый диалог)
                </CardTitle>
                <CardDescription>
                  Создайте команду с 3 шагами: описание → проект → кошелёк
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription>
                    <p className="font-semibold mb-2">🎯 Как работает пошаговый диалог:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li><strong>Шаг 1:</strong> Siri спрашивает "Какую транзакцию добавить?" → Вы: "Такси 500 рублей"</li>
                      <li><strong>Шаг 2:</strong> Siri спрашивает "Какой проект?" → Вы: "Саманта" или "без проекта"</li>
                      <li><strong>Шаг 3:</strong> Siri спрашивает "Какой кошелёк?" → Вы: "Наличка Настя"</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">1. Откройте приложение "Команды" на iPhone</h3>
                    <p className="text-sm text-muted-foreground">Нажмите "+" для создания новой команды</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">2. Добавьте переменные для хранения данных</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Добавьте действие "Установить переменную" для apiKey:
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`Установить переменную "apiKey" на "${apiKey}"`}
                      </pre>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">3. ШАГ 1: Спросить описание транзакции</h3>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Добавьте действие "Запросить ввод":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Вопрос: "Опишите трату или доход и сумму"
Тип: Текст`}</pre>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">Затем "Получить содержимое URL":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`URL: ${apiUrl}
Метод: POST
Заголовки: Content-Type = application/json
Тело (JSON):
{
  "step": 1,
  "text": "[Результат ввода]",
  "apiKey": "[apiKey]"
}`}
                        </pre>
                      </div>

                      <p className="text-sm text-muted-foreground">Сохраните результат:</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Получить "step1Data" из ответа
Показать "message" из ответа`}</pre>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">4. ШАГ 2: Спросить проект</h3>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Добавьте действие "Запросить ввод":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Вопрос: "[Показанное сообщение]"
Тип: Текст`}</pre>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">Затем "Получить содержимое URL":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`URL: ${apiUrl}
Метод: POST
Заголовки: Content-Type = application/json
Тело (JSON):
{
  "step": 2,
  "text": "[Результат ввода]",
  "apiKey": "[apiKey]"
}`}
                        </pre>
                      </div>

                      <p className="text-sm text-muted-foreground">Сохраните результат:</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Получить "projectMatch.id" как projectId (или null)
Получить "staticProjectName" (если проект не найден)
Показать "message" из ответа`}</pre>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">5. ШАГ 3: Спросить кошелёк и создать транзакцию</h3>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Добавьте действие "Запросить ввод":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Вопрос: "[Показанное сообщение]"
Тип: Текст`}</pre>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">Затем "Получить содержимое URL":</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`URL: ${apiUrl}
Метод: POST
Заголовки: Content-Type = application/json
Тело (JSON):
{
  "step": 3,
  "step1Data": [step1Data из шага 1],
  "projectId": [projectId из шага 2 или null],
  "staticProjectName": [staticProjectName из шага 2],
  "cashType": "[Результат ввода]",
  "apiKey": "[apiKey]"
}`}
                        </pre>
                      </div>

                      <p className="text-sm text-muted-foreground">Покажите результат:</p>
                      <div className="p-3 bg-muted rounded-md">
                        <pre className="text-xs">{`Показать "message" из ответа`}</pre>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">6. Назовите команду</h3>
                    <p className="text-sm text-muted-foreground">
                      Например: "Добавь транзакцию" или "Новая трата"
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
                  Шаг 3: Примеры диалога
                </CardTitle>
                <CardDescription>
                  Как выглядит общение с Siri при использовании команды
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Пример диалога:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-primary">Siri:</span>
                        <span>"Опишите трату или доход и сумму"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-green-600">Вы:</span>
                        <span>"Такси до офиса 500 рублей"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-primary">Siri:</span>
                        <span>"💰 Расход 500₽ — Такси до офиса. Какой проект?"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-green-600">Вы:</span>
                        <span>"Саманта"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-primary">Siri:</span>
                        <span>"📁 Проект: 0101 Саманта. Какой кошелёк?"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-green-600">Вы:</span>
                        <span>"Наличка Настя"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-primary">Siri:</span>
                        <span>"✅ Готово! Расход 500₽ создан"</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Без проекта:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-primary">Siri:</span>
                        <span>"Какой проект?"</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-green-600">Вы:</span>
                        <span>"Без проекта" / "Пропустить" / "Нет"</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Умный поиск проектов:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>"Саманта"</strong> → найдет "0101 Саманта - День рождения"</li>
                      <li>• <strong>"0111"</strong> → найдет все проекты начинающиеся с 0111</li>
                      <li>• <strong>"день рождения Маши"</strong> → найдет подходящие события</li>
                      <li>• Если не найдено — сохранит как текст</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertDescription className="space-y-2">
                      <p className="font-semibold">💡 Советы:</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Транзакция создается как черновик — можно отредактировать и добавить чек</li>
                        <li>Система понимает вариации: "наличка настя", "наличные Настя", "кэш Настя"</li>
                        <li>Категория определяется автоматически по описанию</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Legacy Mode */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Альтернатива: Одна команда (для опытных)
                </CardTitle>
                <CardDescription>
                  Можно использовать одну голосовую команду со всеми данными сразу
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Если не указывать параметр <code className="bg-muted px-1 rounded">step</code>, система попытается распознать всё из одной фразы:
                  </p>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Примеры:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "расход 500 такси наличка настя проект саманта"</li>
                      <li>• "трата 1500 аниматоры корп карта лера проект 0111"</li>
                      <li>• "приход 10000 оплата за мероприятие ип настя"</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-muted rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "text": "[Полная голосовая команда]",
  "apiKey": "${apiKey}"
}`}
                    </pre>
                  </div>
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
