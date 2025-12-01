import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';

interface TransactionSuggestions {
  category: string | null;
  project: string | null;
  transaction_type: 'expense' | 'income';
  confidence: number;
}

interface UseTransactionSuggestionsResult {
  suggestions: TransactionSuggestions | null;
  isAnalyzing: boolean;
  confidence: number;
  applySuggestions: () => void;
  dismissSuggestions: () => void;
}

export function useTransactionSuggestions(
  description: string,
  onApply?: (suggestions: TransactionSuggestions) => void
): UseTransactionSuggestionsResult {
  const [suggestions, setSuggestions] = useState<TransactionSuggestions | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const debouncedDescription = useDebounce(description, 500);

  useEffect(() => {
    const fetchSuggestions = async () => {
      // Don't analyze if description is too short, empty, or dismissed
      if (!debouncedDescription || debouncedDescription.length < 5 || isDismissed) {
        setSuggestions(null);
        return;
      }

      setIsAnalyzing(true);

      try {
        const { data, error } = await supabase.functions.invoke('suggest-transaction-fields', {
          body: { description: debouncedDescription }
        });

        if (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions(null);
          return;
        }

        if (data?.suggestions && data.confidence > 0.6) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions(null);
        }
      } catch (error) {
        console.error('Error in useTransactionSuggestions:', error);
        setSuggestions(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    fetchSuggestions();
  }, [debouncedDescription, isDismissed]);

  // Reset dismissed state when description changes significantly
  useEffect(() => {
    setIsDismissed(false);
  }, [debouncedDescription]);

  const applySuggestions = () => {
    if (suggestions && onApply) {
      onApply(suggestions);
      setSuggestions(null);
      setIsDismissed(true);
    }
  };

  const dismissSuggestions = () => {
    setSuggestions(null);
    setIsDismissed(true);
  };

  return {
    suggestions,
    isAnalyzing,
    confidence: suggestions?.confidence || 0,
    applySuggestions,
    dismissSuggestions,
  };
}
