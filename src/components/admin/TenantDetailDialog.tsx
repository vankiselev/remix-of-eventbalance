import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { TenantLogoUpload } from './TenantLogoUpload';

export interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  inn: string | null;
  legal_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  plan: string | null;
}

interface TenantDetailDialogProps {
  tenant: TenantProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const TenantDetailDialog: React.FC<TenantDetailDialogProps> = ({
  tenant,
  open,
  onOpenChange,
  onSaved,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    inn: '',
    legal_name: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        slug: tenant.slug || '',
        description: tenant.description || '',
        inn: tenant.inn || '',
        legal_name: tenant.legal_name || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
      });
    }
  }, [tenant]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const handleNameChange = (value: string) => {
    update('name', value);
    if (!slugManuallyEdited) {
      update('slug', generateSlug(value));
    }
  };

  const handleSave = async () => {
    if (!tenant) return;
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: 'Название и slug обязательны', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Build update object with only non-empty fields
      // Start with fields that definitely exist in schema
      const updateData: Record<string, any> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
      };

      // Try to include extended fields (may not exist if migration not applied yet)
      const extendedFields: Record<string, string> = {
        description: form.description.trim(),
        inn: form.inn.trim(),
        legal_name: form.legal_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };

      // First try with all fields
      let { error } = await (supabase.from('tenants') as any)
        .update({ ...updateData, ...Object.fromEntries(
          Object.entries(extendedFields).map(([k, v]) => [k, v || null])
        ) })
        .eq('id', tenant.id);

      // If error mentions column not found, retry with basic fields only
      if (error?.message?.includes('column') && error?.message?.includes('schema cache')) {
        console.warn('Extended tenant fields not available, saving basic fields only');
        const retryResult = await (supabase.from('tenants') as any)
          .update(updateData)
          .eq('id', tenant.id);
        error = retryResult.error;
      }

      if (error) throw error;

      toast({ title: 'Компания обновлена' });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Карточка компании</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (адрес) *</Label>
              <Input value={form.slug} onChange={(e) => { setSlugManuallyEdited(true); update('slug', generateSlug(e.target.value)); }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Юридическое название</Label>
              <Input value={form.legal_name} onChange={(e) => update('legal_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ИНН</Label>
              <Input value={form.inn} onChange={(e) => update('inn', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Адрес</Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
