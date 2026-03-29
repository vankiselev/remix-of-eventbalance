import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for AI-based grammar correction only.
 * Category/project/wallet detection is handled by the local rule engine.
 */

interface GrammarResult {
  success: boolean;
  corrected_text: string;
  has_errors: boolean;
}

interface UseTransactionAnalysisResult {
  isChecking: boolean;
  hasErrors: boolean;
  correctedText: string | null;
  analysisError: string | null;
  applyCorrection: () => void;
  dismissSuggestions: () => void;
  suppressNextAnalysis: () => void;
  clearCorrection: () => void;
}

export function useTransactionAnalysis(
  description: string,
  onApplyCorrection?: (text: string) => void,
): UseTransactionAnalysisResult {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [correctionApplied, setCorrectionApplied] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const skipNextRef = useRef(false);
  const appliedRef = useRef(false);

  const debouncedDescription = useDebounce(description, 400);

  useEffect(() => {
    if (!debouncedDescription || debouncedDescription.trim().length < 3 || isDismissed) {
      setResult(null);
      setAnalysisError(null);
      return;
    }

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    let cancelled = false;

    const analyze = async () => {
      setIsChecking(true);
      setCorrectionApplied(false);
      setAnalysisError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(`${supabaseUrl}/functions/v1/analyze-transaction-description`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ description: debouncedDescription }),
        });

        if (cancelled) return;

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const errorMsg = data?.error || `Ошибка AI-анализа (${res.status})`;
          console.error('[useTransactionAnalysis] Error:', res.status, errorMsg);
          setAnalysisError(errorMsg);
          setResult(null);
          return;
        }

        if (data?.success) {
          setResult(data as GrammarResult);
        } else {
          setResult(null);
          if (data?.error) {
            setAnalysisError(data.error);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[useTransactionAnalysis] Error:', error);
          setAnalysisError('Не удалось выполнить AI-анализ');
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    analyze();

    return () => { cancelled = true; };
  }, [debouncedDescription, isDismissed]);

  // Reset dismissed when user types new text (not after applying)
  useEffect(() => {
    if (appliedRef.current) {
      appliedRef.current = false;
      return;
    }
    setIsDismissed(false);
  }, [debouncedDescription]);

  const applyCorrection = useCallback(() => {
    if (result?.has_errors && result.corrected_text && onApplyCorrection) {
      appliedRef.current = true;
      skipNextRef.current = true;
      onApplyCorrection(result.corrected_text);
      setCorrectionApplied(true);
    }
  }, [result, onApplyCorrection]);

  const dismissSuggestions = useCallback(() => {
    setResult(null);
    setIsDismissed(true);
  }, []);

  const suppressNextAnalysis = useCallback(() => {
    skipNextRef.current = true;
  }, []);

  const clearCorrection = useCallback(() => {
    setCorrectionApplied(true);
  }, []);

  return {
    isChecking,
    hasErrors: !!(result?.has_errors && !correctionApplied),
    correctedText: result?.has_errors && !correctionApplied ? result.corrected_text : null,
    analysisError,
    applyCorrection,
    dismissSuggestions,
    suppressNextAnalysis,
    clearCorrection,
  };
}
