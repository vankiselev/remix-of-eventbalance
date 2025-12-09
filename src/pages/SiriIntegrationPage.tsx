import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Key, Smartphone, MessageSquare, Mic, Wallet, ChevronRight, Search, Plus, Type, Variable, Globe, FileJson, Eye } from "lucide-react";
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
  note
}: { 
  number: number;
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: string;
  value?: string;
  note?: string;
}) => (
  <div className="flex gap-4 py-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
      {number}
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
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
  children 
}: { 
  icon: React.ElementType;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="h-5 w-5 text-primary" />
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
            {/* Detailed Instructions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Шаг 2: Создайте команду в приложении "Команды"
                </CardTitle>
                <CardDescription>
                  Следуйте инструкциям шаг за шагом. Каждый шаг = одно действие.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <Alert className="bg-blue-500/10 border-blue-500/30">
                  <AlertDescription className="text-sm">
                    📱 <strong>iOS 26 (Liquid Glass):</strong> Интерфейс приложения «Команды» обновлён, но названия действий остались прежними. Ищите действия по английским названиям в скобках.
                  </AlertDescription>
                </Alert>
                
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
                <InstructionSection icon={Key} title="Блок A: Сохраняем API ключ" badge="6 шагов">
                  <InstructionStep
                    number={4}
                    icon={Search}
                    title="В поиске введите «Текст» (Text)"
                    action="Выберите действие «Текст» (Text) из результатов"
                  />
                  <InstructionStep
                    number={5}
                    icon={Type}
                    title="Нажмите на слово «Текст» (Text) в добавленном блоке"
                    action="Вставьте ваш API ключ (скопируйте выше)"
                    value={apiKey.substring(0, 10) + "..."}
                    note="Весь ключ целиком, без пробелов"
                  />
                  <InstructionStep
                    number={6}
                    icon={Plus}
                    title="Нажмите синюю кнопку «+» под блоком «Текст» (Text)"
                    description="Добавляем следующее действие"
                  />
                  <InstructionStep
                    number={7}
                    icon={Search}
                    title="В поиске введите «Задать переменную» (Set Variable)"
                    action="Выберите это действие"
                  />
                  <InstructionStep
                    number={8}
                    icon={Variable}
                    title="В поле «Имя переменной» (Variable Name) напишите:"
                    value="apiKey"
                    note="Точно так, с маленькой буквы"
                  />
                  <InstructionStep
                    number={9}
                    icon={Eye}
                    title="Убедитесь, что в строке «на:» (to:) стоит «Текст» (Text)"
                    description="Это значит переменная apiKey = вашему ключу"
                  />
                </InstructionSection>

                {/* БЛОК B: ШАГ 1 */}
                <InstructionSection icon={MessageSquare} title="Блок B: Спрашиваем описание транзакции" badge="10 шагов">
                  <InstructionStep
                    number={10}
                    icon={Plus}
                    title="Нажмите «+» → найдите «Запросить ввод» (Ask for Input)"
                    action="Выберите это действие"
                  />
                  <InstructionStep
                    number={11}
                    icon={Type}
                    title="В поле «Запрос» (Prompt) напишите:"
                    value="Опишите трату или доход и сумму"
                  />
                  <InstructionStep
                    number={12}
                    icon={Plus}
                    title="Нажмите «+» → найдите «Словарь» (Dictionary)"
                    action="Выберите это действие"
                  />
                  <InstructionStep
                    number={13}
                    icon={FileJson}
                    title="Добавьте 3 строки в словарь (нажмите «Добавить новый элемент» / Add new item):"
                    description="Ключ: step → Значение (текст): 1"
                  />
                  <InstructionStep
                    number={14}
                    icon={FileJson}
                    title="Вторая строка словаря:"
                    description="Ключ: text → Нажмите на значение → Выберите «Полученный ввод» (Provided Input)"
                    note="Это голубая переменная сверху"
                  />
                  <InstructionStep
                    number={15}
                    icon={FileJson}
                    title="Третья строка словаря:"
                    description="Ключ: apiKey → Нажмите на значение → Выберите переменную «apiKey»"
                    note="Это переменная, которую вы создали в Блоке A"
                  />
                  <InstructionStep
                    number={16}
                    icon={Plus}
                    title="Нажмите «+» → найдите «Получить содержимое URL» (Get Contents of URL)"
                    action="Выберите это действие"
                  />
                  <InstructionStep
                    number={17}
                    icon={Globe}
                    title="В поле URL вставьте:"
                    value={apiUrl}
                    note="Скопируйте URL выше"
                  />
                  <InstructionStep
                    number={18}
                    icon={Globe}
                    title="Нажмите «Показать ещё» (Show More) под URL"
                    action="Метод (Method): POST"
                    description="Тело запроса (Request Body): JSON → выберите «Словарь» (Dictionary) из списка выше"
                  />
                  <InstructionStep
                    number={19}
                    icon={Plus}
                    title="Нажмите «+» → найдите «Получить значение из словаря» (Get Dictionary Value)"
                    action="Ключ (Key): message"
                    description="Это покажет ответ Siri с подтверждением"
                  />
                </InstructionSection>

                {/* БЛОК C: ШАГ 2 */}
                <InstructionSection icon={MessageSquare} title="Блок C: Спрашиваем проект" badge="7 шагов">
                  <InstructionStep
                    number={20}
                    icon={Plus}
                    title="Нажмите «+» → «Показать результат» (Show Result)"
                    action="Выберите «Значение словаря» (Dictionary Value) — это message из шага 19"
                    note="Siri озвучит: «Расход 500₽ — Такси. Какой проект?»"
                  />
                  <InstructionStep
                    number={21}
                    icon={Plus}
                    title="Нажмите «+» → «Запросить ввод» (Ask for Input)"
                    value="Скажите проект или «без проекта»"
                  />
                  <InstructionStep
                    number={22}
                    icon={Plus}
                    title="Нажмите «+» → «Словарь» (Dictionary)"
                    description="Создайте новый словарь для второго запроса"
                  />
                  <InstructionStep
                    number={23}
                    icon={FileJson}
                    title="Добавьте 3 строки:"
                    description="step = 2, text = Полученный ввод (Provided Input), apiKey = переменная apiKey"
                  />
                  <InstructionStep
                    number={24}
                    icon={Plus}
                    title="Нажмите «+» → «Получить содержимое URL» (Get Contents of URL)"
                    description="URL: тот же. Метод (Method): POST. Тело (Request Body): JSON → Словарь (Dictionary)"
                  />
                  <InstructionStep
                    number={25}
                    icon={Plus}
                    title="Нажмите «+» → «Получить значение из словаря» (Get Dictionary Value)"
                    action="Ключ (Key): projectId"
                    note="Сохраните в переменную если нужно"
                  />
                  <InstructionStep
                    number={26}
                    icon={Plus}
                    title="Повторите для ключей: staticProjectName и message"
                    description="message покажите через «Показать результат» (Show Result)"
                  />
                </InstructionSection>

                {/* БЛОК D: ШАГ 3 */}
                <InstructionSection icon={Wallet} title="Блок D: Спрашиваем кошелёк и создаём транзакцию" badge="6 шагов">
                  <InstructionStep
                    number={27}
                    icon={Plus}
                    title="Нажмите «+» → «Запросить ввод» (Ask for Input)"
                    value="Какой кошелёк?"
                  />
                  <InstructionStep
                    number={28}
                    icon={Plus}
                    title="Нажмите «+» → «Словарь» (Dictionary)"
                    description="Финальный словарь с данными транзакции"
                  />
                  <InstructionStep
                    number={29}
                    icon={FileJson}
                    title="Добавьте строки:"
                    description="step = 3, cashType = Полученный ввод (Provided Input), apiKey = apiKey, step1Data = данные из шага 1"
                    note="Для step1Data нужно сохранить весь ответ первого запроса"
                  />
                  <InstructionStep
                    number={30}
                    icon={Plus}
                    title="Также добавьте projectId и staticProjectName"
                    description="Из шага 25-26"
                  />
                  <InstructionStep
                    number={31}
                    icon={Plus}
                    title="Нажмите «+» → «Получить содержимое URL» (Get Contents of URL)"
                    description="URL: тот же. Метод (Method): POST. Тело (Request Body): JSON → Словарь (Dictionary)"
                  />
                  <InstructionStep
                    number={32}
                    icon={Plus}
                    title="Нажмите «+» → «Показать результат» (Show Result)"
                    action="Получите message из ответа"
                    note="Siri скажет: «Готово! Черновик создан»"
                  />
                </InstructionSection>

                {/* ЗАВЕРШЕНИЕ */}
                <InstructionSection icon={CheckCircle2} title="Завершение" badge="2 шага">
                  <InstructionStep
                    number={33}
                    icon={Type}
                    title="Нажмите на «Новая команда» вверху экрана"
                    action="Переименуйте в «Добавь транзакцию»"
                  />
                  <InstructionStep
                    number={34}
                    icon={CheckCircle2}
                    title="Нажмите «Готово» в правом верхнем углу"
                    description="Команда сохранена! Скажите «Привет Siri, добавь транзакцию»"
                  />
                </InstructionSection>

                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertDescription>
                    <p className="font-semibold mb-2">⚠️ Это сложно?</p>
                    <p className="text-sm">
                      Пошаговый режим требует много настройки. Если хотите проще — используйте 
                      <strong> Legacy режим</strong> ниже (одна команда вместо трёх шагов).
                    </p>
                  </AlertDescription>
                </Alert>
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
                  Как называть кошельки голосом (для шага 3)
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
                  Пример готового диалога
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

            {/* Legacy Mode */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Legacy режим (упрощённый)
                </CardTitle>
                <CardDescription>
                  Всё в одной команде — быстрее настроить, но нужно говорить всё сразу
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription>
                    <p className="font-semibold mb-2">💡 Как использовать:</p>
                    <p className="text-sm">
                      Скажите всё в одной фразе: «Такси 500 рублей, Саманта, наличка Настя»
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <InstructionSection icon={Smartphone} title="Быстрая настройка" badge="5 шагов">
                    <InstructionStep
                      number={1}
                      icon={Smartphone}
                      title="Откройте «Команды» → «+» → «Добавить действие»"
                    />
                    <InstructionStep
                      number={2}
                      icon={Search}
                      title="Найдите «Запросить ввод»"
                      value="Скажите транзакцию (сумма, проект, кошелёк)"
                    />
                    <InstructionStep
                      number={3}
                      icon={Plus}
                      title="Добавьте «Получить содержимое URL»"
                      description={`URL: ${apiUrl}`}
                    />
                    <InstructionStep
                      number={4}
                      icon={Globe}
                      title="Настройте запрос:"
                      description="Метод: POST, Тело: JSON с полями text (ввод), apiKey (ваш ключ)"
                    />
                    <InstructionStep
                      number={5}
                      icon={Eye}
                      title="Добавьте «Показать результат»"
                      description="Выберите message из ответа"
                    />
                  </InstructionSection>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Пример голосовой команды:</h4>
                  <p className="text-sm text-muted-foreground italic">
                    «Такси пятьсот рублей, проект Саманта, наличка Настя»
                  </p>
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
