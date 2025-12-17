import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Loader2, Check, X, Edit2, ArrowRight, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ParsedTransaction {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  suggestedCategory: string;
}

interface VoiceTestWidgetProps {
  apiKey: string;
  defaultWallet?: string;
  onTransactionCreated?: (transactionId: string) => void;
}

export function VoiceTestWidget({ apiKey, defaultWallet = 'Наличка Настя', onTransactionCreated }: VoiceTestWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      
      if (result.isFinal) {
        processVoiceInput(text);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
      } else if (event.error === 'no-speech') {
        setError('Речь не обнаружена. Попробуйте ещё раз.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setParsedData(null);
    setTranscript('');
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceInput = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('voice-transaction', {
        body: {
          text,
          apiKey,
          step: 1,
          mode: 'simple'
        }
      });

      if (response.error) throw response.error;
      
      const data = response.data;
      if (data.success && data.step1Data) {
        setParsedData(data.step1Data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Error processing voice:', err);
      setError(err.message || 'Ошибка при обработке голоса');
    } finally {
      setIsProcessing(false);
    }
  };

  const createTransaction = async () => {
    if (!parsedData) return;
    
    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke('voice-transaction', {
        body: {
          apiKey,
          mode: 'simple',
          step: 3,
          step1Data: parsedData,
          cashType: defaultWallet
        }
      });

      if (response.error) throw response.error;
      
      const data = response.data;
      if (data.success) {
        toast.success('Черновик создан!', {
          description: `${parsedData.type === 'expense' ? 'Расход' : 'Приход'} ${parsedData.amount}₽ — ${parsedData.description}`
        });
        setParsedData(null);
        setTranscript('');
        onTransactionCreated?.(data.transaction?.id);
      } else {
        throw new Error(data.error || 'Ошибка создания');
      }
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      toast.error('Ошибка при создании транзакции');
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setParsedData(null);
    setTranscript('');
    setError(null);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              Ваш браузер не поддерживает распознавание речи. Используйте Chrome или Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Volume2 className="h-5 w-5" />
          Тестирование голосовых команд
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Microphone Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isCreating}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
              "focus:outline-none focus:ring-4 focus:ring-primary/30",
              isListening 
                ? "bg-destructive text-destructive-foreground animate-pulse scale-110" 
                : "bg-primary text-primary-foreground hover:scale-105 hover:bg-primary/90",
              (isProcessing || isCreating) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>
          
          <p className="text-sm text-muted-foreground text-center">
            {isListening ? 'Говорите...' : isProcessing ? 'Обработка...' : 'Нажмите и говорите'}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Распознано:</p>
            <p className="font-medium">{transcript}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Parsed Result */}
        {parsedData && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={parsedData.type === 'expense' ? 'destructive' : 'default'}>
                  {parsedData.type === 'expense' ? '↓ Расход' : '↑ Приход'}
                </Badge>
                <span className="text-2xl font-bold">{parsedData.amount.toLocaleString('ru-RU')} ₽</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Описание:</span>
                  <span className="font-medium">{parsedData.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Категория:</span>
                  <span className="font-medium truncate max-w-[200px]">{parsedData.suggestedCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Кошелёк:</span>
                  <span className="font-medium">{defaultWallet}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={createTransaction} 
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Создать черновик
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Hints */}
        {!parsedData && !isListening && !isProcessing && (
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Примеры команд:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">"Такси 500 рублей"</Badge>
              <Badge variant="outline">"Расход 1500 аниматоры"</Badge>
              <Badge variant="outline">"Приход 10000 за мероприятие"</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
