import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Copy, 
  CheckCircle2, 
  Key, 
  ExternalLink, 
  QrCode,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuickSetupCardProps {
  apiKey: string;
  apiUrl: string;
  onGenerateKey: () => Promise<void>;
  isGenerating: boolean;
}

export function QuickSetupCard({ apiKey, apiUrl, onGenerateKey, isGenerating }: QuickSetupCardProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const copyToClipboard = async (text: string, type: 'key' | 'url') => {
    await navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success('Скопировано!');
  };

  // Generate a simple shortcut import URL
  const shortcutConfig = {
    name: 'Добавь транзакцию',
    url: apiUrl,
    apiKey: apiKey,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5" />
          Быстрая установка Siri Shortcut
        </CardTitle>
        <CardDescription>
          Настройте голосовые команды за 1 минуту
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: API Key */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">1</Badge>
            <span className="font-medium">API ключ</span>
          </div>
          
          {!apiKey ? (
            <Button 
              onClick={onGenerateKey} 
              disabled={isGenerating}
              className="w-full"
            >
              <Key className="h-4 w-4 mr-2" />
              {isGenerating ? 'Создание...' : 'Создать API ключ'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  value={apiKey} 
                  readOnly 
                  type="password"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiKey, 'key')}
                >
                  {copiedKey ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Сохраните ключ — он показывается только один раз
              </p>
            </div>
          )}
        </div>

        {apiKey && (
          <>
            {/* Step 2: Install Shortcut */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">2</Badge>
                <span className="font-medium">Установите Shortcut на iPhone</span>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                <p className="text-sm">
                  Откройте приложение <strong>Shortcuts</strong> на iPhone и создайте новую команду с этими настройками:
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">URL:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs truncate max-w-[180px]">{apiUrl}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(apiUrl, 'url')}>
                        {copiedUrl ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">Method:</span>
                    <Badge variant="outline">POST</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">Request Body:</span>
                    <Badge variant="outline">JSON</Badge>
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Простой режим:</strong> Отправьте JSON с полями <code>text</code>, <code>apiKey</code> и <code>mode: "simple"</code>. 
                    Транзакция создастся автоматически с вашими настройками по умолчанию.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Step 3: Test */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">3</Badge>
                <span className="font-medium">Проверьте</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Скажите Siri: <strong>"Добавь транзакцию"</strong> и следуйте инструкциям. 
                Или используйте виджет выше для тестирования в браузере.
              </p>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Расширенные настройки</span>
                  {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <h4 className="font-medium">Пример Request Body (простой режим):</h4>
                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "text": "Такси 500 рублей",
  "apiKey": "${apiKey.substring(0, 10)}...",
  "mode": "simple"
}`}
                  </pre>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <h4 className="font-medium">Многошаговый режим (продвинутый):</h4>
                  <p className="text-sm text-muted-foreground">
                    Для выбора проекта и кошелька голосом используйте поэтапный режим с <code>step: 1, 2, 3</code>.
                    Подробная документация доступна в разделе ниже.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}
