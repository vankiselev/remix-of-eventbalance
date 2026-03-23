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
  type: "expense" | "income";
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
  const finalResultsRef = useRef<Map<number, string>>(new Map());
  const liveTranscriptRef = useRef("");
  const shouldProcessOnEndRef = useRef(false);

  const setTranscriptSynced = (value: string) => {
    liveTranscriptRef.current = value;
    setTranscript(value);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ru-RU";

    recognition.onresult = (event: any) => {
      const interimParts: string[] = [];

      // IMPORTANT: iterate from resultIndex to avoid reprocessing old results (duplicate transcript bug)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result?.[0]?.transcript?.trim();
        if (!chunk) continue;

        if (result.isFinal) {
          finalResultsRef.current.set(i, chunk);
        } else {
          interimParts.push(chunk);
        }
      }

      const finalTranscript = Array.from(finalResultsRef.current.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => value)
        .join(" ")
        .trim();

      const interimTranscript = interimParts.join(" ").trim();
      const merged = [finalTranscript, interimTranscript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

      setTranscriptSynced(merged);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed") {
        setError("Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.");
      } else if (event.error === "no-speech") {
        setError("Речь не обнаружена. Попробуйте ещё раз.");
      } else if (event.error === "network") {
        setError("Ошибка сети. Проверьте подключение к интернету.");
      } else {
        setError("Не удалось распознать речь. Попробуйте ввести текст вручную.");
      }

      shouldProcessOnEndRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!shouldProcessOnEndRef.current) return;
      shouldProcessOnEndRef.current = false;

      const finalText = liveTranscriptRef.current.trim();
      if (finalText) {
        void processText(finalText);
      } else {
        setError("Не удалось распознать речь. Попробуйте говорить чуть медленнее или введите текст вручную.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
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
    if (!recognitionRef.current || isProcessing || isCreating) return;

    setParsedData(null);
    setError(null);
    setTextInput("");
    setTranscriptSynced("");
    finalResultsRef.current = new Map();
    shouldProcessOnEndRef.current = false;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setError("Не удалось запустить запись. Попробуйте ещё раз или введите текст вручную.");
    }
  }, [isCreating, isProcessing]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    shouldProcessOnEndRef.current = true;
    setIsListening(false);

    try {
      recognitionRef.current.stop();
    } catch {
      // Если stop упал, все равно попробуем обработать текущий текст
      shouldProcessOnEndRef.current = false;
      const snapshot = liveTranscriptRef.current.trim();
      if (snapshot) {
        void processText(snapshot);
      }
    }
  }, []);

  const processText = async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("voice-transaction", {
        body: { text: normalizedText },
      });

      if (fnError) {
        const backendError = await extractEdgeErrorMessage(fnError);
        throw new Error(backendError || getUserFriendlyError(fnError));
      }

      if (!data?.success && data?.error) {
        setError(data.error);
        if (data.partialData) {
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
      console.error("Error processing voice input:", err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    const text = textInput.trim();
    if (!text) return;

    setTranscriptSynced(text);
    await processText(text);
  };

  const createTransaction = async () => {
    if (!parsedData || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("voice-transaction", {
        body: {
          step: "create",
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
        const backendError = await extractEdgeErrorMessage(fnError);
        throw new Error(backendError || getUserFriendlyError(fnError));
      }

      if (!data?.success && data?.error) {
        setError(data.error);
        return;
      }

      toast({
        title: "Черновик создан",
        description: `${parsedData.type === "expense" ? "Расход" : "Приход"}: ${parsedData.amount.toLocaleString("ru-RU")} ₽ — ${parsedData.description}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setTranscriptSynced("");
    setTextInput("");
    setParsedData(null);
    setError(null);
    setIsListening(false);
    setIsProcessing(false);
    setIsCreating(false);
    shouldProcessOnEndRef.current = false;
    finalResultsRef.current = new Map();
  };

  const isSpeechSupported =
    typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Голосовой ввод транзакции
          </DialogTitle>
          <DialogDescription>Произнесите или введите описание транзакции</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {isSpeechSupported && (
            <>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isCreating}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                  "focus:outline-none focus:ring-4 focus:ring-primary/20",
                  isListening ? "bg-destructive text-destructive-foreground scale-110" : "bg-primary text-primary-foreground hover:scale-105",
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleTextSubmit();
                    }
                  }}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleTextSubmit} disabled={!textInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

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

          {parsedData && parsedData.amount > 0 && (
            <div className="w-full p-4 border rounded-lg space-y-3">
              {parsedData.confidence !== undefined && parsedData.confidence < 50 && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">⚠️ Разбор неуверенный — проверьте данные перед созданием</div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Тип</span>
                <span className={cn("font-medium", parsedData.type === "expense" ? "text-destructive" : "text-primary")}>
                  {parsedData.type === "expense" ? "Расход" : "Приход"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Сумма</span>
                <span className="font-bold text-lg">{parsedData.amount.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Описание</span>
                <span className="font-medium text-right max-w-[200px]">{parsedData.description}</span>
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

          {parsedData && parsedData.amount > 0 && (
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={isCreating}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Заново
              </Button>
              <Button className="flex-1" onClick={createTransaction} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Создать черновик
              </Button>
            </div>
          )}

          {!transcript && !parsedData && !isListening && !textInput && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Примеры:</p>
              <div className="flex flex-wrap gap-2">
                {["Такси 1200 наличка Настя", "Передал Петру 5000 наличка Лера", "Приход 5000 от клиента"].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTextInput(example);
                    }}
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

async function extractEdgeErrorMessage(fnError: unknown): Promise<string | null> {
  if (!fnError || typeof fnError !== "object") return null;

  const maybeContext = (fnError as { context?: unknown }).context;
  if (!maybeContext || typeof maybeContext !== "object") return null;

  const response = maybeContext as Response;
  if (typeof response.clone !== "function") return null;

  try {
    const parsed = await response.clone().json();
    if (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: unknown }).error === "string") {
      return (parsed as { error: string }).error;
    }
  } catch {
    // ignore json parse errors
  }

  return null;
}

function getUserFriendlyError(err: unknown): string {
  if (!err) return "Произошла ошибка. Попробуйте ещё раз.";

  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Ошибка сети. Проверьте подключение к интернету.";
  }
  if (message.includes("rate limit") || message.includes("429")) {
    return "Слишком много запросов. Подождите минуту.";
  }
  if (message.includes("401") || message.includes("auth") || message.includes("Unauthorized")) {
    return "Необходима авторизация. Перезайдите в приложение.";
  }
  if (message.includes("non-2xx") || message.includes("FunctionsHttpError")) {
    return "Не удалось обработать голосовой ввод. Попробуйте ещё раз.";
  }

  if (/[а-яА-Я]/.test(message) && !message.includes("Error") && !message.includes("error")) {
    return message;
  }

  return "Произошла ошибка. Попробуйте ещё раз.";
}
