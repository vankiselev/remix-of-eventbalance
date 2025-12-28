import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, X, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const [displayedTranscript, setDisplayedTranscript] = useState("");
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  // Load API key
  useEffect(() => {
    if (isOpen) {
      loadApiKey();
    }
  }, [isOpen]);

  const loadApiKey = async () => {
    setIsLoadingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setApiKey(data?.api_key || null);
    } catch (err) {
      console.error('Error loading API key:', err);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate old keys
      await supabase
        .from('user_api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Generate new key
      const newKey = `vt_${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          api_key: newKey,
          is_active: true,
          name: 'Voice Transaction Key'
        });

      if (error) throw error;
      
      setApiKey(newKey);
      toast({
        title: "API-ключ создан",
        description: "Теперь вы можете использовать голосовой ввод",
      });
    } catch (err) {
      console.error('Error generating API key:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось создать API-ключ",
        variant: "destructive",
      });
    }
  };

  // Animate transcript appearance
  useEffect(() => {
    if (transcript.length > displayedTranscript.length) {
      const targetLength = transcript.length;
      let currentLength = displayedTranscript.length;
      
      const animate = () => {
        if (currentLength < targetLength) {
          currentLength += 1;
          setDisplayedTranscript(transcript.substring(0, currentLength));
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setDisplayedTranscript(transcript);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [transcript]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'ru-RU';

        let finalText = '';
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + ' ';
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          // Show final + current interim
          setTranscript((finalText + interimTranscript).trim());
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Ошибка распознавания: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          finalText = ''; // Reset for next session
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      setDisplayedTranscript("");
      setParsedData(null);
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      if (transcript.trim()) {
        await processVoiceInput(transcript.trim());
      }
    }
  }, [transcript]);

  const processVoiceInput = async (text: string) => {
    if (!apiKey) {
      setError("API-ключ не найден");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('voice-transaction', {
        body: {
          apiKey: apiKey,
          mode: 'simple',
          step: 1,
          text: text,
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setParsedData({
        amount: data.amount,
        description: data.description,
        type: data.type,
        suggestedCategory: data.suggestedCategory,
      });
    } catch (err) {
      console.error('Error processing voice input:', err);
      setError(err instanceof Error ? err.message : 'Ошибка обработки');
    } finally {
      setIsProcessing(false);
    }
  };

  const createTransaction = async () => {
    if (!parsedData || !apiKey) return;

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('voice-transaction', {
        body: {
          apiKey: apiKey,
          mode: 'simple',
          step: 3,
          step1Data: {
            amount: parsedData.amount,
            description: parsedData.description,
            type: parsedData.type,
            suggestedCategory: parsedData.suggestedCategory,
          },
          cashType: 'Наличка Ваня',
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Черновик создан",
        description: `${parsedData.type === 'expense' ? 'Трата' : 'Приход'}: ${parsedData.amount.toLocaleString('ru-RU')} ₽`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err instanceof Error ? err.message : 'Ошибка создания транзакции');
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setTranscript("");
    setDisplayedTranscript("");
    setParsedData(null);
    setError(null);
    setIsListening(false);
    setIsProcessing(false);
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
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {isLoadingKey ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка...
            </div>
          ) : !apiKey ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Для использования голосового ввода нужен API-ключ
              </p>
              <Button onClick={generateApiKey}>
                Создать API-ключ
              </Button>
            </div>
          ) : !isSpeechSupported ? (
            <div className="text-center text-muted-foreground">
              <p>Ваш браузер не поддерживает распознавание речи.</p>
              <p className="text-sm mt-2">Попробуйте использовать Chrome или Edge.</p>
            </div>
          ) : (
            <>
              {/* Microphone Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isCreating}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                  "focus:outline-none focus:ring-4 focus:ring-primary/20",
                  isListening 
                    ? "bg-destructive text-destructive-foreground scale-110" 
                    : "bg-primary text-primary-foreground hover:scale-105",
                  (isProcessing || isCreating) && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Pulse animation when listening */}
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-25" />
                    <span className="absolute inset-[-8px] rounded-full border-4 border-destructive/30 animate-pulse" />
                  </>
                )}
                
                {isProcessing ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>

              <p className="text-sm text-muted-foreground">
                {isListening ? "Говорите... Нажмите для остановки" : "Нажмите для начала записи"}
              </p>

              {/* Transcript Display */}
              {(displayedTranscript || isListening) && (
                <div className="w-full min-h-[80px] p-4 bg-muted rounded-lg relative overflow-hidden">
                  <p className="text-foreground leading-relaxed">
                    {displayedTranscript}
                    {isListening && (
                      <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse" />
                    )}
                  </p>
                  {!displayedTranscript && isListening && (
                    <p className="text-muted-foreground italic">Ожидание речи...</p>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Parsed Transaction Preview */}
              {parsedData && (
                <div className="w-full p-4 border rounded-lg space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Тип</span>
                    <span className={cn(
                      "font-medium",
                      parsedData.type === 'expense' ? "text-destructive" : "text-success"
                    )}>
                      {parsedData.type === 'expense' ? 'Трата' : 'Приход'}
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
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {parsedData.description}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Категория</span>
                    <span className="text-sm">{parsedData.suggestedCategory}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {parsedData && (
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
              {!transcript && !parsedData && !isListening && (
                <div className="w-full space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Примеры команд:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Купил кофе за 350 рублей",
                      "Потратил 1500 на такси",
                      "Получил 50000 от клиента",
                    ].map((example, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                      >
                        "{example}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
