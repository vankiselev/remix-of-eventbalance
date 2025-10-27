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
                    <h3 className="font-semibold mb-2">3. Добавьте действие "Запросить ввод" (Ask for Input)</h3>
                    
                    <div className="space-y-3 ml-2">
                      <div>
                        <p className="text-sm font-medium mb-1">Как найти действие:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>В поле поиска введите <span className="font-mono bg-muted px-1 rounded">Запросить ввод</span> или <span className="font-mono bg-muted px-1 rounded">Ask for Input</span></li>
                          <li>Выберите действие с иконкой "+" голубого цвета</li>
                          <li>Полное название: <span className="font-semibold">Запросить ввод</span></li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Настройка параметров:</p>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Тип ввода:</span>
                            <p className="text-muted-foreground ml-2">→ Выберите <span className="font-semibold">Текст</span> из выпадающего списка</p>
                            <p className="text-xs text-muted-foreground ml-2">Это позволит вводить данные голосом или с клавиатуры</p>
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium">Вопрос:</span>
                            <p className="text-muted-foreground ml-2">→ Введите: <span className="font-mono bg-muted px-1 rounded">"Какую транзакцию добавить?"</span></p>
                            <p className="text-xs text-muted-foreground ml-2">Это то, что Siri спросит при запуске команды</p>
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium">По умолчанию:</span>
                            <p className="text-muted-foreground ml-2">→ Оставьте <span className="font-semibold">пустым</span></p>
                            <p className="text-xs text-muted-foreground ml-2">Не заполняйте, так как каждый раз детали будут разные</p>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertDescription className="text-xs">
                          <p className="font-semibold mb-1">💡 Зачем это нужно:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Активирует голосовой или текстовый ввод</li>
                            <li>Позволяет Siri запросить у вас информацию о транзакции</li>
                            <li>Передает введенный текст в следующие шаги команды</li>
                            <li>После ответа текст сохраняется как переменная для шага 4</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-xs font-medium mb-2">Как должно выглядеть готовое действие:</p>
                        <pre className="text-xs text-muted-foreground">
{`┌─────────────────────────────────┐
│ Запросить ввод                   │
│ ────────────────────────────    │
│ Тип: Текст                       │
│ Вопрос: "Какую транзакцию        │
│         добавить?"               │
│ По умолчанию: [пусто]            │
└─────────────────────────────────┘`}
                        </pre>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-medium text-destructive">⚠️ Частые ошибки:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          <li>❌ Не выбирайте "Запросить входные данные" - это другое действие</li>
                          <li>❌ Не используйте "Спросить Алису" или другие голосовые ассистенты</li>
                          <li>✅ Нужно именно "Запросить ввод" с иконкой "+"</li>
                        </ul>
                      </div>

                      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                        <AlertDescription className="text-xs">
                          <p className="font-semibold mb-1">⚡ Альтернативный способ (для опытных):</p>
                          <p>Можно пропустить этот шаг и сразу начать с шага 4 "Диктовка текста". В этом случае Siri сразу активирует микрофон при запуске команды, но не будет показан текстовый вопрос-подсказка.</p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">4. Добавьте действие "Диктовка текста" (Dictate Text)</h3>
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
                    <h3 className="font-semibold mb-2">6. Добавьте действие "Получить содержимое URL" (Get Contents of URL)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Это ключевой шаг - здесь настраивается отправка голосовой команды на сервер для обработки
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Настройки запроса:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                          <li><span className="font-medium">Метод:</span> POST</li>
                          <li><span className="font-medium">Заголовки:</span> Content-Type = application/json</li>
                          <li><span className="font-medium">Тело запроса:</span> JSON</li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Структура JSON:</p>
                        <div className="p-3 bg-muted rounded-md">
                          <pre className="text-xs overflow-x-auto">
{`{
  "text": "[Результат диктовки]",
  "apiKey": "${apiKey}"
}`}
                          </pre>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>• <span className="font-medium">text:</span> Вставьте переменную "Результат диктовки" из предыдущего шага</p>
                          <p>• <span className="font-medium">apiKey:</span> Ваш уникальный API ключ для аутентификации</p>
                        </div>
                      </div>

                      <Alert className="mt-3">
                        <AlertDescription className="text-xs">
                          <p className="font-semibold mb-1">💡 Как это работает:</p>
                          <p>Система использует AI для распознавания вашей голосовой команды и автоматически:</p>
                          <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                            <li>Определяет сумму и описание</li>
                            <li>Подбирает категорию (такси → Доставка, продукты → Продукты и т.д.)</li>
                            <li>Распознает владельца проекта (наличка Настя, корп карта и т.д.)</li>
                            <li>Ищет проект по названию или префиксу (0111, 0101 саманта)</li>
                            <li>Создает транзакцию без обязательного чека (можно добавить позже в приложении)</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">7. Добавьте действие "Показать результат" (Show Result)</h3>
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
                  Как правильно формулировать команды для Siri. Система автоматически распознает суммы, категории, владельцев и проекты.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Базовые расходы:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "потратил 500 рублей на такси"</li>
                      <li>• "купил продукты на тысячу"</li>
                      <li>• "заправка 2500 рублей"</li>
                      <li>• "оплатил интернет 800"</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Расходы с владельцем проекта:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "добавь расход 200 рублей такси наличка настя"</li>
                      <li>• "трата 1500 аниматоры корп карта лера"</li>
                      <li>• "расход 3000 продукты наличка ваня"</li>
                      <li>• "потратил 500 на доставку ИП настя"</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Владельцы: Наличка Настя/Лера/Ваня, Корп. карта Настя/Лера/Ваня, ИП Настя/Лера/Ваня, ООО Настя/Лера/Ваня, Своя Настя/Лера/Ваня
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Расходы с указанием проекта:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "добавь расход 200 рублей Такси до офиса наличка настя проект 0101 саманта"</li>
                      <li>• "трата 500 такси проект 0111"</li>
                      <li>• "расход 1500 аниматоры корп карта лера проект День рождения"</li>
                      <li>• "потратил 800 на фотографа проект 0112 корпоратив"</li>
                    </ul>
                    <Alert className="mt-3">
                      <AlertDescription className="text-xs">
                        <p className="font-semibold mb-1">🎯 Умный поиск проектов:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li><span className="font-medium">Точное совпадение:</span> "проект 0101 саманта" найдет событие с таким названием</li>
                          <li><span className="font-medium">Префикс:</span> "проект 0111" покажет все проекты, начинающиеся с 0111</li>
                          <li><span className="font-medium">Частичное:</span> "проект день рождения" найдет события с этими словами</li>
                          <li><span className="font-medium">Не найдено:</span> проект будет сохранен как статическое название</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Доходы:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• "приход 5000 за мероприятие"</li>
                      <li>• "получил зарплату 50000 корп карта настя"</li>
                      <li>• "доход 3000 от клиента проект 0101 саманта"</li>
                      <li>• "приход 10000 оплата за событие наличка лера"</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Автоматическое определение категорий:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="font-medium text-xs mb-1">Транспорт:</p>
                        <p className="text-xs text-muted-foreground">такси, трансфер, доставка, парковка</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs mb-1">Персонал:</p>
                        <p className="text-xs text-muted-foreground">аниматоры, шоу, зарплата, бонус</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs mb-1">Медиа:</p>
                        <p className="text-xs text-muted-foreground">фото, видео, фотограф</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs mb-1">Расходы:</p>
                        <p className="text-xs text-muted-foreground">продукты, закупки, реквизит, костюмы</p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="space-y-2">
                      <p className="font-semibold">💡 Советы по использованию:</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Чек не обязателен - его можно добавить позже в приложении</li>
                        <li>Все транзакции через Siri помечаются для проверки</li>
                        <li>Если проект не найден точно, система предложит выбрать из списка</li>
                        <li>Владелец по умолчанию - "Наличка Настя"</li>
                        <li>Система понимает вариации: "наличка настя", "наличные Настя" и т.д.</li>
                      </ul>
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
