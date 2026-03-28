import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';


function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const CLOUD_FUNCTIONS_URL = `https://aobbrgmuvkopkjijbejz.supabase.co/functions/v1`;
const CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmJyZ211dmtvcGtqaWpiZWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzA2NzUsImV4cCI6MjA4NTIwNjY3NX0.hKgvQ679v764rIIYWU1CCiwCtgNA_c6N4L9oK5XuxEg';

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
  suppressNextCheck: () => void;
  clearCorrection: () => void;
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
  const skipNextRef = useRef(false);

  const debouncedDescription = useDebounce(description, 300);

  useEffect(() => {
    if (!debouncedDescription || debouncedDescription.trim().length < 3) {
      setHasErrors(false);
      setCorrectedText(null);
      setErrors([]);
      setCheckError(null);
      return;
    }

    // Skip this check if correction was just applied
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    const checkDescription = async () => {
      setIsChecking(true);
      setCheckError(null);

      try {
        const response = await fetch(`${CLOUD_FUNCTIONS_URL}/check-transaction-description`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CLOUD_ANON_KEY,
            'Authorization': `Bearer ${CLOUD_ANON_KEY}`,
          },
          body: JSON.stringify({
            text: debouncedDescription,
            category: category || undefined,
          }),
        });

        if (!response.ok) {
          console.error('Error checking description:', response.status);
          setCheckError('Не удалось проверить текст');
          setHasErrors(false);
          setCorrectedText(null);
          setErrors([]);
          return;
        }

        const result: CheckResult = await response.json();

        setHasErrors(result.has_errors);
        setCorrectedText(result.has_errors ? capitalizeFirst(result.corrected_text) : null);
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

  const suppressNextCheck = useCallback(() => {
    skipNextRef.current = true;
  }, []);

  const clearCorrection = useCallback(() => {
    setHasErrors(false);
    setCorrectedText(null);
    setErrors([]);
  }, []);

  return {
    isChecking,
    hasErrors,
    correctedText,
    errors,
    checkError,
    suppressNextCheck,
    clearCorrection,
  };
}
