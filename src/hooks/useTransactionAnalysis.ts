import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';

/**
 * Minimum confidence for backend to return a category (below this → null).
 * Must match the backend constant MIN_CONFIDENCE_TO_RETURN_CATEGORY.
 */
export const MIN_CONFIDENCE_TO_RETURN_CATEGORY = 0.6;

/**
 * Minimum confidence to auto-apply category in UI without user confirmation.
 * Category suggestions below this threshold are shown but not auto-applied.
 */
export const MIN_CONFIDENCE_TO_AUTO_APPLY = 0.75;

interface AnalysisResult {
  success: boolean;
  corrected_text: string;
  has_errors: boolean;
  category: string | null;
  confidence: number;
  transaction_type: 'expense' | 'income';
  reasoning: string | null;
}

interface UseTransactionAnalysisResult {
  isChecking: boolean;
  hasErrors: boolean;
  correctedText: string | null;
  suggestedCategory: string | null;
  suggestedTransactionType: 'expense' | 'income' | null;
  confidence: number;
  analysisError: string | null;
  applyCorrection: () => void;
  applyCategory: () => void;
  applyAll: () => void;
  dismissSuggestions: () => void;
  suppressNextAnalysis: () => void;
  clearCorrection: () => void;
}

export function useTransactionAnalysis(
  description: string,
  currentCategory?: string,
  onApplyCorrection?: (text: string) => void,
  onApplyCategory?: (category: string, transactionType: 'expense' | 'income') => void,
): UseTransactionAnalysisResult {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
        // Use direct fetch for better error diagnostics (project pattern)
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
          body: JSON.stringify({
            description: debouncedDescription,
            currentCategory: currentCategory || null,
          }),
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

        const analysisData = data as AnalysisResult & { error?: string };
        if (analysisData?.success) {
          setResult(analysisData);
        } else {
          setResult(null);
          if (analysisData?.error) {
            setAnalysisError(analysisData.error);
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
  }, [debouncedDescription, currentCategory, isDismissed]);

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

  const applyCategory = useCallback(() => {
    if (result?.category && result.confidence >= MIN_CONFIDENCE_TO_RETURN_CATEGORY && onApplyCategory) {
      appliedRef.current = true;
      skipNextRef.current = true;
      onApplyCategory(result.category, result.transaction_type);
      setResult(prev => prev ? { ...prev, category: null } : null);
      setIsDismissed(true);
    }
  }, [result, onApplyCategory]);

  const applyAll = useCallback(() => {
    if (result?.has_errors && result.corrected_text && onApplyCorrection) {
      onApplyCorrection(result.corrected_text);
      setCorrectionApplied(true);
    }
    if (result?.category && result.confidence >= MIN_CONFIDENCE_TO_RETURN_CATEGORY && onApplyCategory) {
      onApplyCategory(result.category, result.transaction_type);
    }
    appliedRef.current = true;
    skipNextRef.current = true;
    setResult(null);
    setIsDismissed(true);
  }, [result, onApplyCorrection, onApplyCategory]);

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
    suggestedCategory: result?.category || null,
    suggestedTransactionType: result?.transaction_type || null,
    confidence: result?.confidence || 0,
    analysisError,
    applyCorrection,
    applyCategory,
    applyAll,
    dismissSuggestions,
    suppressNextAnalysis,
    clearCorrection,
  };
}
