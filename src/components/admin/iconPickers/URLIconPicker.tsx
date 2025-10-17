import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";

interface URLIconPickerProps {
  currentUrl?: string;
  onUrlChange: (url: string) => void;
}

export const URLIconPicker = ({ currentUrl, onUrlChange }: URLIconPickerProps) => {
  const [url, setUrl] = useState(currentUrl || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const validateUrl = async () => {
      if (!url) {
        setIsValid(false);
        setError('');
        return;
      }

      try {
        new URL(url); // Validate URL format
        setIsValidating(true);
        setError('');

        // Try to load the image
        const img = new Image();
        img.onload = () => {
          setIsValid(true);
          setIsValidating(false);
          onUrlChange(url);
        };
        img.onerror = () => {
          setIsValid(false);
          setError('Не удалось загрузить изображение по этому URL');
          setIsValidating(false);
        };
        img.src = url;
      } catch (e) {
        setIsValid(false);
        setError('Некорректный URL');
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateUrl, 500);
    return () => clearTimeout(debounceTimer);
  }, [url, onUrlChange]);

  const popularIconSources = [
    { name: 'Iconify', url: 'https://icon-sets.iconify.design/', desc: 'Огромная коллекция бесплатных иконок' },
    { name: 'Flaticon', url: 'https://www.flaticon.com/', desc: 'Миллионы бесплатных иконок' },
    { name: 'Icons8', url: 'https://icons8.com/', desc: 'Бесплатные иконки в разных стилях' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="iconUrl">URL изображения</Label>
        <div className="flex gap-2">
          <Input
            id="iconUrl"
            type="url"
            placeholder="https://example.com/icon.svg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {isValidating && (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isValid && url && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Превью:</span>
          </div>
          <div className="flex items-center justify-center h-32 bg-background rounded">
            <img
              src={url}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
              onError={() => setIsValid(false)}
            />
          </div>
        </div>
      )}

      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm font-medium">Популярные источники бесплатных иконок:</p>
        <div className="grid gap-2">
          {popularIconSources.map((source) => (
            <Button
              key={source.name}
              variant="outline"
              className="justify-start h-auto p-3"
              asChild
            >
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                <div className="flex items-start gap-2 text-left">
                  <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{source.name}</div>
                    <div className="text-xs text-muted-foreground">{source.desc}</div>
                  </div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>💡 <strong>Как использовать:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Найдите иконку на одном из сайтов выше</li>
          <li>Скопируйте прямую ссылку на изображение</li>
          <li>Вставьте ссылку в поле выше</li>
          <li>Убедитесь, что ссылка публичная и не требует авторизации</li>
        </ul>
      </div>
    </div>
  );
};
