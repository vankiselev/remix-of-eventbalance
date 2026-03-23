import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateSlug } from '@/utils/slugUtils';

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Не авторизован');

      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: { name: name.trim(), slug: slug.trim().toLowerCase() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Компания создана', description: `${name} (${slug})` });
      setOpen(false);
      setName('');
      setSlug('');
      onCreated();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const slugValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length >= 3;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Создать компанию
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая компания</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Название</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Fantasy Kids"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Адрес (slug)</Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="fantasy-kids"
              maxLength={30}
              required
            />
            {slug && !slugValid && (
              <p className="text-xs text-destructive">
                Минимум 3 символа, только латиница, цифры и дефисы
              </p>
            )}
          </div>
          <Button type="submit" disabled={isLoading || !name.trim() || !slugValid} className="w-full">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
