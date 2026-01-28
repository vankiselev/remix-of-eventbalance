import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, ArrowLeft, Check, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const companySchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(100, 'Максимум 100 символов'),
  slug: z.string()
    .min(3, 'Минимум 3 символа')
    .max(30, 'Максимум 30 символов')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Только латинские буквы, цифры и дефисы'),
});

// Reserved slugs
const RESERVED_SLUGS = ['auth', 'register', 'admin', 'api', 'awaiting-invitation', 'select-company', 'default', 'app', 'www'];

/**
 * RegisterCompanyPage - Page for registering a new company
 */
const RegisterCompanyPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'details' | 'success'>('details');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<{ slug: string; name: string } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  // Auto-generate slug from name
  useEffect(() => {
    if (companyName && !slug) {
      const generatedSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
      setSlug(generatedSlug);
    }
  }, [companyName]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    if (RESERVED_SLUGS.includes(slug)) {
      setSlugAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { data, error } = await (supabase.rpc as any)('is_tenant_slug_available', { _slug: slug });
        if (!error) {
          setSlugAvailable(data === true);
        }
      } catch (e) {
        console.error('Error checking slug:', e);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const validateForm = (): boolean => {
    const result = companySchema.safeParse({ name: companyName, slug });
    
    if (!result.success) {
      const fieldErrors: { name?: string; slug?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === 'name') fieldErrors.name = err.message;
        if (err.path[0] === 'slug') fieldErrors.slug = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    if (RESERVED_SLUGS.includes(slug)) {
      setErrors({ slug: 'Этот адрес зарезервирован' });
      return false;
    }

    if (slugAvailable === false) {
      setErrors({ slug: 'Этот адрес уже занят' });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    if (!user) {
      toast.error('Необходимо авторизоваться');
      navigate('/auth');
      return;
    }

    setIsCreating(true);
    try {
      // Call edge function to create tenant
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          name: companyName.trim(),
          slug: slug.trim().toLowerCase(),
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setCreatedTenant({ slug: data.tenant.slug, name: data.tenant.name });
      setStep('success');
      toast.success('Компания успешно создана!');
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast.error(error.message || 'Ошибка при создании компании');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGoToCompany = () => {
    if (createdTenant) {
      navigate(`/${createdTenant.slug}/dashboard`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Создание компании</CardTitle>
            <CardDescription>
              Для создания компании необходимо войти в систему
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Войти или зарегистрироваться
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success' && createdTenant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="h-16 w-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Компания создана!</CardTitle>
            <CardDescription>
              {createdTenant.name} готова к работе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Адрес вашей компании:</p>
              <p className="font-mono text-lg">eventbalance.ru/{createdTenant.slug}</p>
            </div>
            
            <Button onClick={handleGoToCompany} className="w-full">
              Перейти в компанию
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        <Card>
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Создание компании</CardTitle>
            <CardDescription>
              Создайте свою компанию для управления мероприятиями
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Название компании</Label>
              <Input
                id="name"
                placeholder="Fantasy Kids"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Адрес компании</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  eventbalance.ru/
                </span>
                <div className="relative flex-1">
                  <Input
                    id="slug"
                    placeholder="fantasykids"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className={errors.slug ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingSlug && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!isCheckingSlug && slugAvailable === true && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {!isCheckingSlug && slugAvailable === false && (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              </div>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug}</p>
              )}
              {!errors.slug && slugAvailable === false && (
                <p className="text-sm text-destructive">Этот адрес уже занят</p>
              )}
              {!errors.slug && slugAvailable === true && (
                <p className="text-sm text-green-600">Адрес свободен</p>
              )}
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating || !companyName || !slug || slugAvailable !== true}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать компанию'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterCompanyPage;
