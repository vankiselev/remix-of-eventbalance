import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, RotateCcw, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ParsedTransaction {
  amount: number;
  description: string;
  type: 'expense' | 'income';
  suggestedCategory: string;
  cashType?: string | null;
  confidence?: number;
}

interface VoiceTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VoiceTransactionDialog({ isOpen, onOpenChange, onSuccess }: VoiceTransactionDialogProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';

        let finalText = '';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + ' ';
            } else {
              interimTranscript += result[0].transcript;
            }
          }
          setTranscript((finalText + interimTranscript).trim());
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
          } else if (event.error === 'no-speech') {
            setError('Речь не обнаружена. Попробуйте ещё раз.');
          } else if (event.error === 'network') {
            setError('Ошибка сети. Проверьте подключение к интернету.');
          } else {
            setError('Не удалось распознать речь. Попробуйте ввести текст вручную.');
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          finalText = '';
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      setTextInput("");
      setParsedData(null);
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setError('Не удалось запустить запись. Попробуйте ввести текст вручную.');
      }
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
      
      if (transcript.trim()) {
        await processText(transcript.trim());
      }
    }
  }, [transcript]);

  const processText = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('voice-transaction', {
        body: { text },
      });

      if (fnError) {
        throw new Error(getUserFriendlyError(fnError));
      }

      if (!data?.success && data?.error) {
        setError(data.error);
        if (data.partialData) {
          // Show partial data even on error
          setParsedData(data.partialData);
        }
        return;
      }

      if (data?.success) {
        setParsedData({
          amount: data.amount,
          description: data.description,
          type: data.type,
          suggestedCategory: data.suggestedCategory,
          cashType: data.cashType,
          confidence: data.confidence,
        });
      }
    } catch (err) {
      console.error('Error processing voice input:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    const text = textInput.trim();
    if (!text) return;
    setTranscript(text);
    await processText(text);
  };

  const createTransaction = async () => {
    if (!parsedData) return;

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('voice-transaction', {
        body: {
          step: 'create',
          step1Data: {
            amount: parsedData.amount,
            description: parsedData.description,
            type: parsedData.type,
            suggestedCategory: parsedData.suggestedCategory,
            cashType: parsedData.cashType,
          },
        },
      });

      if (fnError) {
        throw new Error(getUserFriendlyError(fnError));
      }

      if (!data?.success && data?.error) {
        setError(data.error);
        return;
      }

      toast({
        title: "Черновик создан",
        description: `${parsedData.type === 'expense' ? 'Расход' : 'Приход'}: ${parsedData.amount.toLocaleString('ru-RU')} ₽ — ${parsedData.description}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setTranscript("");
    setTextInput("");
    setParsedData(null);
    setError(null);
    setIsListening(false);
    setIsProcessing(false);
    setIsCreating(false);
  };

  const isSpeechSupported = typeof window !== 'undefined' && 
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Голосовой ввод транзакции
          </DialogTitle>
          <DialogDescription>
            Произнесите или введите описание транзакции
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Microphone Button */}
          {isSpeechSupported && (
            <>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isCreating}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                  "focus:outline-none focus:ring-4 focus:ring-primary/20",
                  isListening 
                    ? "bg-destructive text-destructive-foreground scale-110" 
                    : "bg-primary text-primary-foreground hover:scale-105",
                  (isProcessing || isCreating) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-25" />
                    <span className="absolute inset-[-8px] rounded-full border-4 border-destructive/30 animate-pulse" />
                  </>
                )}
                
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>

              <p className="text-sm text-muted-foreground">
                {isListening ? "Говорите... Нажмите для остановки" : isProcessing ? "Обработка..." : "Нажмите для записи"}
              </p>
            </>
          )}

          {/* Transcript Display */}
          {transcript && !isListening && (
            <div className="w-full p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Распознано:</p>
              <p className="text-foreground">{transcript}</p>
            </div>
          )}

          {isListening && (
            <div className="w-full min-h-[60px] p-3 bg-muted rounded-lg">
              <p className="text-foreground">
                {transcript || <span className="text-muted-foreground italic">Ожидание речи...</span>}
                <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />
              </p>
            </div>
          )}

          {/* Text Input Fallback */}
          {!isListening && !parsedData && !isProcessing && (
            <div className="w-full">
              <div className="flex items-center gap-1 mb-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">или введите текстом</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Такси 500 рублей наличка Ваня"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
                  className="flex-1"
                />
                <Button 
                  size="icon" 
                  onClick={handleTextSubmit} 
                  disabled={!textInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <p className="text-destructive">{error}</p>
              {!parsedData && (
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={reset}>
                  Попробовать снова
                </Button>
              )}
            </div>
          )}

          {/* Parsed Transaction Preview */}
          {parsedData && parsedData.amount > 0 && (
            <div className="w-full p-4 border rounded-lg space-y-3">
              {parsedData.confidence !== undefined && parsedData.confidence < 50 && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  ⚠️ Разбор неуверенный — проверьте данные перед созданием
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Тип</span>
                <span className={cn(
                  "font-medium",
                  parsedData.type === 'expense' ? "text-destructive" : "text-green-600"
                )}>
                  {parsedData.type === 'expense' ? 'Расход' : 'Приход'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Сумма</span>
                <span className="font-bold text-lg">
                  {parsedData.amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Описание</span>
                <span className="font-medium text-right max-w-[200px]">
                  {parsedData.description}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Категория</span>
                <span className="text-sm text-right max-w-[200px]">{parsedData.suggestedCategory}</span>
              </div>
              {parsedData.cashType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Кошелёк</span>
                  <span className="text-sm">{parsedData.cashType}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {parsedData && parsedData.amount > 0 && (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={reset}
                disabled={isCreating}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Заново
              </Button>
              <Button
                className="flex-1"
                onClick={createTransaction}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Создать черновик
              </Button>
            </div>
          )}

          {/* Examples */}
          {!transcript && !parsedData && !isListening && !textInput && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Примеры:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Такси 1200 наличка Настя",
                  "Передал Ване 2500 наличка",
                  "Приход 50000 от клиента",
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => { setTextInput(example); }}
                    className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getUserFriendlyError(err: unknown): string {
  if (!err) return 'Произошла ошибка. Попробуйте ещё раз.';
  
  const message = err instanceof Error ? err.message : String(err);
  
  if (message.includes('non-2xx') || message.includes('FunctionsHttpError')) {
    return 'Сервис обработки временно недоступен. Попробуйте через минуту.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Ошибка сети. Проверьте подключение к интернету.';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Слишком много запросов. Подождите минуту.';
  }
  if (message.includes('401') || message.includes('auth') || message.includes('Unauthorized')) {
    return 'Необходима авторизация. Перезайдите в приложение.';
  }
  
  // If it's already a user-friendly Russian message, return as is
  if (/[а-яА-Я]/.test(message) && !message.includes('Error') && !message.includes('error')) {
    return message;
  }
  
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
