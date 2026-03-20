import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

const CLOUD_FUNCTIONS_URL = `https://aobbrgmuvkopkjijbejz.supabase.co/functions/v1`;
const CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmJyZ211dmtvcGtqaWpiZWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzA2NzUsImV4cCI6MjA4NTIwNjY3NX0.hKgvQ679v764rIIYWU1CCiwCtgNA_c6N4L9oK5XuxEg';

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
  suppressNextAnalysis: () => void;
}

export function useTransactionSuggestions(
  description: string,
  onApply?: (suggestions: TransactionSuggestions) => void
): UseTransactionSuggestionsResult {
  const [suggestions, setSuggestions] = useState<TransactionSuggestions | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const skipNextRef = useRef(false);
  const appliedRef = useRef(false);
  const debouncedDescription = useDebounce(description, 500);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedDescription || debouncedDescription.length < 5 || isDismissed) {
        setSuggestions(null);
        return;
      }

      // Skip if suppressed (e.g., after applying correction)
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }

      setIsAnalyzing(true);

      try {
        const response = await fetch(`${CLOUD_FUNCTIONS_URL}/suggest-transaction-fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CLOUD_ANON_KEY,
            'Authorization': `Bearer ${CLOUD_ANON_KEY}`,
          },
          body: JSON.stringify({ description: debouncedDescription }),
        });

        if (!response.ok) {
          console.error('Error fetching suggestions:', response.status);
          setSuggestions(null);
          return;
        }

        const data = await response.json();

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

  useEffect(() => {
    setIsDismissed(false);
  }, [debouncedDescription]);

  const applySuggestions = useCallback(() => {
    if (suggestions && onApply) {
      onApply(suggestions);
      setSuggestions(null);
      setIsDismissed(true);
    }
  }, [suggestions, onApply]);

  const dismissSuggestions = useCallback(() => {
    setSuggestions(null);
    setIsDismissed(true);
  }, []);

  const suppressNextAnalysis = useCallback(() => {
    skipNextRef.current = true;
  }, []);

  return {
    suggestions,
    isAnalyzing,
    confidence: suggestions?.confidence || 0,
    applySuggestions,
    dismissSuggestions,
    suppressNextAnalysis,
  };
}
