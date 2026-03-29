import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

const CLOUD_FUNCTIONS_URL = `https://aobbrgmuvkopkjijbejz.supabase.co/functions/v1`;
const CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmJyZ211dmtvcGtqaWpiZWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzA2NzUsImV4cCI6MjA4NTIwNjY3NX0.hKgvQ679v764rIIYWU1CCiwCtgNA_c6N4L9oK5XuxEg';

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
  // Description checking
  isChecking: boolean;
  hasErrors: boolean;
  correctedText: string | null;
  // Category suggestions
  suggestedCategory: string | null;
  suggestedTransactionType: 'expense' | 'income' | null;
  confidence: number;
  // Actions
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
  const skipNextRef = useRef(false);
  const appliedRef = useRef(false);

  const debouncedDescription = useDebounce(description, 400);

  useEffect(() => {
    if (!debouncedDescription || debouncedDescription.trim().length < 3 || isDismissed) {
      setResult(null);
      return;
    }

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    const controller = new AbortController();

    const analyze = async () => {
      setIsChecking(true);
      setCorrectionApplied(false);

      try {
        const response = await fetch(`${CLOUD_FUNCTIONS_URL}/analyze-transaction-description`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CLOUD_ANON_KEY,
            'Authorization': `Bearer ${CLOUD_ANON_KEY}`,
          },
          body: JSON.stringify({
            description: debouncedDescription,
            currentCategory: currentCategory || null,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error('[useTransactionAnalysis] Error:', response.status);
          setResult(null);
          return;
        }

        const data: AnalysisResult = await response.json();
        if (data.success) {
          setResult(data);
        } else {
          setResult(null);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[useTransactionAnalysis] Error:', error);
          setResult(null);
        }
      } finally {
        setIsChecking(false);
      }
    };

    analyze();

    return () => controller.abort();
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

  const applyCategory = useCallback(() => {
    if (result?.category && result.confidence >= 0.6 && onApplyCategory) {
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
    if (result?.category && result.confidence >= 0.6 && onApplyCategory) {
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
    applyCorrection,
    applyCategory,
    applyAll,
    dismissSuggestions,
    suppressNextAnalysis,
    clearCorrection,
  };
}
