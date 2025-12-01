import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

interface ErrorDetail {
  original: string;
  correction: string;
  type: 'spelling' | 'grammar';
}

interface CheckResult {
  has_errors: boolean;
  corrected_text: string;
  errors: ErrorDetail[];
}

interface UseDescriptionCheckerResult {
  isChecking: boolean;
  hasErrors: boolean;
  correctedText: string | null;
  errors: ErrorDetail[];
  checkError: string | null;
}

export function useDescriptionChecker(
  description: string,
  category?: string
): UseDescriptionCheckerResult {
  const [isChecking, setIsChecking] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [errors, setErrors] = useState<ErrorDetail[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Debounce the description to avoid too many API calls
  const debouncedDescription = useDebounce(description, 1500);

  useEffect(() => {
    // Reset state if description is empty or too short
    if (!debouncedDescription || debouncedDescription.trim().length < 3) {
      setHasErrors(false);
      setCorrectedText(null);
      setErrors([]);
      setCheckError(null);
      return;
    }

    const checkDescription = async () => {
      setIsChecking(true);
      setCheckError(null);

      try {
        const { data, error } = await supabase.functions.invoke('check-transaction-description', {
          body: { 
            text: debouncedDescription,
            category: category || undefined
          }
        });

        if (error) {
          console.error('Error checking description:', error);
          setCheckError('Не удалось проверить текст');
          setHasErrors(false);
          setCorrectedText(null);
          setErrors([]);
          return;
        }

        const result = data as CheckResult;
        
        setHasErrors(result.has_errors);
        setCorrectedText(result.has_errors ? result.corrected_text : null);
        setErrors(result.errors || []);

      } catch (err) {
        console.error('Exception checking description:', err);
        setCheckError('Ошибка при проверке текста');
        setHasErrors(false);
        setCorrectedText(null);
        setErrors([]);
      } finally {
        setIsChecking(false);
      }
    };

    checkDescription();
  }, [debouncedDescription, category]);

  return {
    isChecking,
    hasErrors,
    correctedText,
    errors,
    checkError,
  };
}
