import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2, Key, Smartphone, MessageSquare, Mic, Wallet, ChevronRight, Search, Plus, Type, Variable, Globe, FileJson, Eye, AlertTriangle, ArrowRight, Save, Database, Zap, HelpCircle } from "lucide-react";
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

// Компонент для одного шага инструкции
const InstructionStep = ({ 
  number, 
  icon: Icon, 
  title, 
  description, 
  action,
  value,
  note,
  important
}: { 
  number: number;
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: string;
  value?: string;
  note?: string;
  important?: boolean;
}) => (
  <div className={`flex gap-4 py-3 ${important ? 'bg-amber-500/5 -mx-2 px-2 rounded-lg border border-amber-500/20' : ''}`}>
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${important ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}`}>
      {number}
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        {important && <Badge variant="destructive" className="text-xs">ВАЖНО</Badge>}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="flex items-center gap-2 text-sm">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span className="text-primary font-medium">{action}</span>
        </div>
      )}
      {value && (
        <div className="p-2 bg-muted rounded-md font-mono text-sm">
          {value}
        </div>
      )}
      {note && (
        <p className="text-xs text-muted-foreground italic">{note}</p>
      )}
    </div>
  </div>
);

// Компонент для секции инструкций
const InstructionSection = ({ 
  icon: Icon, 
  title, 
  badge,
  variant = 'default',
  children 
}: { 
  icon: React.ElementType;
  title: string;
  badge?: string;
  variant?: 'default' | 'success' | 'warning';
  children: React.ReactNode;
}) => {
  const bgColor = variant === 'success' ? 'bg-green-500/10' : variant === 'warning' ? 'bg-amber-500/10' : 'bg-primary/10';
  const textColor = variant === 'success' ? 'text-green-600' : variant === 'warning' ? 'text-amber-600' : 'text-primary';
  
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <Icon className={`h-5 w-5 ${textColor}`} />
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {badge && (
          <Badge variant="secondary" className="ml-auto">{badge}</Badge>
        )}
      </div>
      <div className="divide-y">
        {children}
      </div>
    </div>
  );
};

// Компонент для визуальной схемы потока данных
const DataFlowDiagram = () => (
  <div className="p-4 bg-muted/50 rounded-lg border">
    <h4 className="font-semibold mb-4 flex items-center gap-2">
      <Database className="h-4 w-4" />
      Схема потока данных между шагами
    </h4>
    <div className="space-y-4">
      {/* Step 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-500">Шаг 1</Badge>
            <span className="text-sm font-medium">Описание транзакции</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>📥 Ввод: <code>"Такси 500 рублей"</code></div>
            <div>📤 Ответ: <code>step1Data</code> (amount, description, type, category)</div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <Save className="h-3 w-3" />
            <span className="text-xs font-medium">Сохранить</span>
          </div>
          <code className="text-xs">step1Data</code>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-500">Шаг 2</Badge>
            <span className="text-sm font-medium">Выбор проекта</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>📥 Ввод: <code>"Саманта"</code></div>
            <div>📤 Ответ: <code>projectId</code>, <code>staticProjectName</code></div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <Save className="h-3 w-3" />
            <span className="text-xs font-medium">Сохранить</span>
          </div>
          <code className="text-xs block">projectId</code>
          <code className="text-xs block">staticProjectName</code>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-orange-500">Шаг 3</Badge>
            <span className="text-sm font-medium">Кошелёк + создание</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>📥 Нужно передать: <code>step1Data</code> + <code>projectId</code> + <code>staticProjectName</code> + <code>cashType</code></div>
            <div>📤 Результат: Черновик транзакции создан ✅</div>
          </div>
        </div>
      </div>
    </div>

    <Alert className="mt-4 bg-amber-500/10 border-amber-500/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <strong>Ключевой момент:</strong> Каждый ответ сервера нужно сохранить в переменную через <code>Set Variable</code>, иначе данные потеряются и шаг 3 не сможет создать транзакцию!
      </AlertDescription>
    </Alert>
  </div>
);

// Компонент для отображения ошибок и их решений
const TroubleshootingSection = () => (
  <div className="space-y-4">
    <h4 className="font-semibold flex items-center gap-2">
      <HelpCircle className="h-4 w-4" />
      Частые ошибки и их решения
    </h4>
    
    <div className="space-y-3">
      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-sm">Invalid API key</p>
            <p className="text-xs text-muted-foreground mt-1">
              Проверьте: (1) переменная называется точно <code>apiKey</code>, (2) ключ скопирован полностью без пробелов, (3) в Request Body поле apiKey использует переменную, а не текст
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-sm">step1Data and cashType are required for step 3</p>
            <p className="text-xs text-muted-foreground mt-1">
              Вы не сохранили <code>step1Data</code> в переменную после шага 1. Убедитесь, что после каждого "Get Contents of URL" вы используете "Get Dictionary Value" и "Set Variable" для сохранения данных.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-sm">projectId required</p>
            <p className="text-xs text-muted-foreground mt-1">
              Не сохранён projectId после шага 2. Используйте "Get Dictionary Value" с ключом <code>projectId</code> и сохраните результат в переменную.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Siri говорит "Произошла ошибка"</p>
            <p className="text-xs text-muted-foreground mt-1">
              Обычно проблема с JSON в Request Body. Убедитесь, что: (1) выбран метод POST, (2) Request Body = JSON, (3) все поля имеют тип Text, (4) значения переменных вставлены корректно.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function SiriIntegrationPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const copyToClipboard = (text: string, type: 'key' | 'url' = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success("Скопировано в буфер обмена!");
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
              <div className="space-y-4">
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
                      onClick={() => copyToClipboard(apiKey, 'key')}
                    >
                      {isCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>URL для запросов:</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={apiUrl} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(apiUrl, 'url')}
                    >
                      {copiedUrl ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    ⚠️ Сохраните API ключ — вы не сможете увидеть его снова. URL можно скопировать в любой момент.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {apiKey && (
          <>
            {/* Mode Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Шаг 2: Выберите режим настройки
                </CardTitle>
                <CardDescription>
                  Выберите способ настройки в зависимости от ваших предпочтений
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="legacy" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="legacy" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Простой (рекомендуется)
                    </TabsTrigger>
                    <TabsTrigger value="multistep" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Многошаговый
                    </TabsTrigger>
                  </TabsList>

                  {/* LEGACY MODE */}
                  <TabsContent value="legacy" className="space-y-6 mt-6">
                    <Alert className="bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Рекомендуем начать с этого режима!</strong> Простая настройка за 5 минут. Вы говорите всё в одной фразе.
                      </AlertDescription>
                    </Alert>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Пример голосовой команды:</h4>
                      <p className="text-sm italic text-muted-foreground">
                        «Такси пятьсот рублей, проект Саманта, наличка Настя»
                      </p>
                    </div>

                    <InstructionSection icon={Smartphone} title="Быстрая настройка" badge="6 шагов" variant="success">
                      <InstructionStep
                        number={1}
                        icon={Smartphone}
                        title="Откройте приложение «Команды» (Shortcuts)"
                        description="Нажмите «+» в правом верхнем углу → «Добавить действие»"
                      />
                      <InstructionStep
                        number={2}
                        icon={Search}
                        title="Найдите «Текст» (Text)"
                        action="Добавьте действие и вставьте ваш API ключ"
                        value={apiKey.substring(0, 15) + "..."}
                      />
                      <InstructionStep
                        number={3}
                        icon={Variable}
                        title="Нажмите «+» → найдите «Задать переменную» (Set Variable)"
                        action="Имя переменной: apiKey"
                        note="Убедитесь, что в поле 'на:' стоит 'Текст' из предыдущего шага"
                      />
                      <InstructionStep
                        number={4}
                        icon={Search}
                        title="Нажмите «+» → найдите «Запросить ввод» (Ask for Input)"
                        value="Скажите транзакцию (сумма, проект, кошелёк)"
                      />
                      <InstructionStep
                        number={5}
                        icon={Globe}
                        title="Нажмите «+» → найдите «Получить содержимое URL» (Get Contents of URL)"
                        description="Настройте как показано ниже"
                      />
                      <div className="ml-12 space-y-3 py-3 px-4 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <span className="font-medium">URL:</span>
                          <code className="ml-2 text-xs bg-background px-2 py-1 rounded block mt-1 break-all">{apiUrl}</code>
                        </div>
                        <div>
                          <span className="font-medium">Метод (Method):</span>
                          <code className="ml-2 bg-background px-2 py-1 rounded">POST</code>
                        </div>
                        <div>
                          <span className="font-medium">Тело запроса (Request Body):</span>
                          <code className="ml-2 bg-background px-2 py-1 rounded">JSON</code>
                        </div>
                        <Separator className="my-2" />
                        <div className="font-medium mb-2">Добавьте 2 поля (Add new field):</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">text</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">Полученный ввод (Provided Input)</Badge>
                            <span className="text-xs text-muted-foreground">(голубая переменная)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">apiKey</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">apiKey</Badge>
                            <span className="text-xs text-muted-foreground">(переменная из шага 3)</span>
                          </div>
                        </div>
                      </div>
                      <InstructionStep
                        number={6}
                        icon={Eye}
                        title="Нажмите «+» → «Получить значение из словаря» → «Показать результат»"
                        action="Ключ: message"
                        description="Siri озвучит результат создания транзакции"
                      />
                    </InstructionSection>

                    <InstructionSection icon={CheckCircle2} title="Завершение" badge="2 шага" variant="success">
                      <InstructionStep
                        number={7}
                        icon={Type}
                        title="Нажмите на название «Новая команда» вверху"
                        action="Переименуйте в «Добавь транзакцию»"
                      />
                      <InstructionStep
                        number={8}
                        icon={CheckCircle2}
                        title="Нажмите «Готово»"
                        description="Скажите «Привет Siri, добавь транзакцию» и продиктуйте всё в одной фразе!"
                      />
                    </InstructionSection>
                  </TabsContent>

                  {/* MULTISTEP MODE */}
                  <TabsContent value="multistep" className="space-y-6 mt-6">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Продвинутый режим.</strong> Siri задаёт 3 вопроса по очереди. Сложнее в настройке, но удобнее в использовании. Требует сохранения переменных между шагами.
                      </AlertDescription>
                    </Alert>

                    {/* Data Flow Diagram */}
                    <DataFlowDiagram />

                    {/* ПОДГОТОВКА */}
                    <InstructionSection icon={Smartphone} title="Подготовка" badge="3 шага">
                      <InstructionStep
                        number={1}
                        icon={Smartphone}
                        title="Откройте приложение «Команды» (Shortcuts) на iPhone"
                        description="Это стандартное приложение Apple. Если его нет — скачайте из App Store."
                      />
                      <InstructionStep
                        number={2}
                        icon={Plus}
                        title="Нажмите «+» в правом верхнем углу"
                        description="Создаём новую команду (shortcut)"
                      />
                      <InstructionStep
                        number={3}
                        icon={Plus}
                        title="Нажмите «Добавить действие» (Add Action)"
                        description="Откроется каталог действий"
                      />
                    </InstructionSection>

                    {/* БЛОК A: API КЛЮЧ */}
                    <InstructionSection icon={Key} title="Блок A: Сохраняем API ключ" badge="4 шага">
                      <InstructionStep
                        number={4}
                        icon={Search}
                        title="В поиске введите «Текст» (Text)"
                        action="Вставьте ваш API ключ целиком"
                        value={apiKey.substring(0, 15) + "..."}
                      />
                      <InstructionStep
                        number={5}
                        icon={Plus}
                        title="Нажмите «+» → найдите «Задать переменную» (Set Variable)"
                        action="Имя переменной: apiKey"
                        important
                        note="Точно так, с маленькой буквы. Это критически важно!"
                      />
                    </InstructionSection>

                    {/* БЛОК B: ШАГ 1 */}
                    <InstructionSection icon={MessageSquare} title="Блок B: Шаг 1 — Описание транзакции" badge="6 шагов">
                      <InstructionStep
                        number={6}
                        icon={Plus}
                        title="Нажмите «+» → «Запросить ввод» (Ask for Input)"
                        value="Опишите трату или доход и сумму"
                      />
                      <InstructionStep
                        number={7}
                        icon={Globe}
                        title="Нажмите «+» → «Получить содержимое URL» (Get Contents of URL)"
                        description="URL, Метод POST, Request Body JSON — как показано ниже"
                      />
                      <div className="ml-12 space-y-2 py-3 px-4 bg-muted/50 rounded-lg text-sm">
                        <div className="font-medium mb-2">Request Body (3 поля):</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">step</Badge>
                            <span className="text-muted-foreground">→</span>
                            <code className="bg-background px-2 py-0.5 rounded">1</code>
                            <span className="text-xs text-muted-foreground">(тип: Text)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">text</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">Полученный ввод</Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">apiKey</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">apiKey</Badge>
                            <span className="text-xs text-muted-foreground">(переменная)</span>
                          </div>
                        </div>
                      </div>
                      <InstructionStep
                        number={8}
                        icon={Variable}
                        title="ВАЖНО: Сохраните ответ сервера!"
                        important
                        description="Нажмите «+» → «Задать переменную» (Set Variable)"
                        action="Имя переменной: step1Response"
                        note="В поле 'на:' должно быть 'Содержимое URL' (Contents of URL)"
                      />
                      <InstructionStep
                        number={9}
                        icon={FileJson}
                        title="Извлеките step1Data из ответа"
                        description="Нажмите «+» → «Получить значение из словаря» (Get Dictionary Value)"
                        action="Словарь: step1Response, Ключ: step1Data"
                      />
                      <InstructionStep
                        number={10}
                        icon={Save}
                        title="Сохраните step1Data в переменную"
                        important
                        description="Нажмите «+» → «Задать переменную» (Set Variable)"
                        action="Имя переменной: step1Data"
                        note="Без этого шаг 3 не сможет создать транзакцию!"
                      />
                      <InstructionStep
                        number={11}
                        icon={Eye}
                        title="Покажите сообщение пользователю"
                        description="«Получить значение из словаря» → Ключ: message → «Показать результат»"
                      />
                    </InstructionSection>

                    {/* БЛОК C: ШАГ 2 */}
                    <InstructionSection icon={Search} title="Блок C: Шаг 2 — Выбор проекта" badge="6 шагов">
                      <InstructionStep
                        number={12}
                        icon={Plus}
                        title="Нажмите «+» → «Запросить ввод» (Ask for Input)"
                        value="Скажите проект или «без проекта»"
                      />
                      <InstructionStep
                        number={13}
                        icon={Globe}
                        title="Нажмите «+» → «Получить содержимое URL»"
                        description="URL тот же, Method POST, Request Body JSON"
                      />
                      <div className="ml-12 space-y-2 py-3 px-4 bg-muted/50 rounded-lg text-sm">
                        <div className="font-medium mb-2">Request Body (3 поля):</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">step</Badge>
                            <span className="text-muted-foreground">→</span>
                            <code className="bg-background px-2 py-0.5 rounded">2</code>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">text</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">Полученный ввод</Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">apiKey</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">apiKey</Badge>
                          </div>
                        </div>
                      </div>
                      <InstructionStep
                        number={14}
                        icon={Variable}
                        title="Сохраните ответ → «Задать переменную»"
                        action="Имя переменной: step2Response"
                      />
                      <InstructionStep
                        number={15}
                        icon={Save}
                        title="Извлеките и сохраните projectId"
                        important
                        description="«Получить значение из словаря» → Ключ: projectId → «Задать переменную» → projectId"
                      />
                      <InstructionStep
                        number={16}
                        icon={Save}
                        title="Извлеките и сохраните staticProjectName"
                        important
                        description="«Получить значение из словаря» (step2Response) → Ключ: staticProjectName → «Задать переменную» → staticProjectName"
                      />
                      <InstructionStep
                        number={17}
                        icon={Eye}
                        title="Покажите message через «Показать результат»"
                      />
                    </InstructionSection>

                    {/* БЛОК D: ШАГ 3 */}
                    <InstructionSection icon={Wallet} title="Блок D: Шаг 3 — Кошелёк и создание транзакции" badge="4 шага" variant="warning">
                      <InstructionStep
                        number={18}
                        icon={Plus}
                        title="Нажмите «+» → «Запросить ввод»"
                        value="Какой кошелёк?"
                      />
                      <InstructionStep
                        number={19}
                        icon={Globe}
                        title="Нажмите «+» → «Получить содержимое URL»"
                        description="URL тот же, Method POST, Request Body JSON"
                      />
                      <div className="ml-12 space-y-2 py-3 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                        <div className="font-medium mb-2 text-amber-600">⚠️ Request Body (6 полей — все обязательны!):</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">step</Badge>
                            <span className="text-muted-foreground">→</span>
                            <code className="bg-background px-2 py-0.5 rounded">3</code>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">cashType</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">Полученный ввод</Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">apiKey</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal">apiKey</Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap bg-amber-500/10 p-1 rounded">
                            <Badge variant="outline" className="font-mono border-amber-500">step1Data</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal bg-amber-500/20">step1Data</Badge>
                            <span className="text-xs text-amber-600 font-medium">(из шага 10!)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap bg-amber-500/10 p-1 rounded">
                            <Badge variant="outline" className="font-mono border-amber-500">projectId</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal bg-amber-500/20">projectId</Badge>
                            <span className="text-xs text-amber-600 font-medium">(из шага 15!)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap bg-amber-500/10 p-1 rounded">
                            <Badge variant="outline" className="font-mono border-amber-500">staticProjectName</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="font-normal bg-amber-500/20">staticProjectName</Badge>
                            <span className="text-xs text-amber-600 font-medium">(из шага 16!)</span>
                          </div>
                        </div>
                      </div>
                      <InstructionStep
                        number={20}
                        icon={CheckCircle2}
                        title="Покажите финальный результат"
                        description="«Получить значение из словаря» → Ключ: message → «Показать результат»"
                        note="Siri скажет: «✅ Черновик создан: Такси — 500₽, Наличка Настя, проект Саманта»"
                      />
                    </InstructionSection>

                    {/* ЗАВЕРШЕНИЕ */}
                    <InstructionSection icon={CheckCircle2} title="Завершение" badge="2 шага" variant="success">
                      <InstructionStep
                        number={21}
                        icon={Type}
                        title="Переименуйте команду"
                        action="Нажмите на «Новая команда» → «Добавь транзакцию»"
                      />
                      <InstructionStep
                        number={22}
                        icon={CheckCircle2}
                        title="Нажмите «Готово»"
                        description="Команда сохранена! Скажите «Привет Siri, добавь транзакцию»"
                      />
                    </InstructionSection>

                    {/* Troubleshooting */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Устранение ошибок
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TroubleshootingSection />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Wallet Types Reference */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Справочник кошельков
                </CardTitle>
                <CardDescription>
                  Как называть кошельки голосом
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

            {/* Example Dialogue */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Пример готового диалога (многошаговый режим)
                </CardTitle>
                <CardDescription>
                  Так будет выглядеть общение после настройки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex gap-2 items-start">
                    <Badge variant="secondary" className="mt-0.5">Вы</Badge>
                    <span className="text-sm">«Привет Siri, добавь транзакцию»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge className="mt-0.5">Siri</Badge>
                    <span className="text-sm">«Опишите трату или доход и сумму»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge variant="secondary" className="mt-0.5">Вы</Badge>
                    <span className="text-sm">«Такси до офиса пятьсот рублей»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge className="mt-0.5">Siri</Badge>
                    <span className="text-sm">«💰 Расход 500₽ — Такси до офиса. Категория: Транспорт. Какой проект?»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge variant="secondary" className="mt-0.5">Вы</Badge>
                    <span className="text-sm">«Саманта»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge className="mt-0.5">Siri</Badge>
                    <span className="text-sm">«📁 Проект: 0101 Саманта. Какой кошелёк?»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge variant="secondary" className="mt-0.5">Вы</Badge>
                    <span className="text-sm">«Наличка Настя»</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge className="mt-0.5">Siri</Badge>
                    <span className="text-sm">«✅ Черновик создан: Такси до офиса — 500₽, Наличка Настя, проект Саманта»</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  ⚠️ Безопасность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>API ключ даёт доступ к созданию транзакций от вашего имени</li>
                  <li>Не передавайте ключ третьим лицам</li>
                  <li>Если ключ скомпрометирован — создайте новый (старый деактивируется)</li>
                  <li>Все транзакции создаются как черновики — проверьте их в приложении</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
