import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneInputRU } from "@/components/ui/phone-input-ru";
import { AvatarCropper } from "@/components/ui/avatar-cropper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Loader2, LogOut } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

const profileSchema = z.object({
  last_name: z.string().min(1, "Фамилия обязательна"),
  first_name: z.string().min(1, "Имя обязательно"),
  middle_name: z.string().optional(),
  email: z.string().email("Некорректный email"),
  phone_display: z.string().optional(),
  birth_date: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Profile {
  user_id: string;
  user_email: string;
  user_full_name: string;
  user_last_name?: string;
  user_first_name?: string;
  user_middle_name?: string;
  user_phone?: string;
  user_birth_date?: string;
  user_avatar_url?: string;
  user_position?: string;
  user_salary?: number;
  user_employment_status?: string;
}

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      last_name: "",
      first_name: "",
      middle_name: "",
      email: "",
      phone_display: "",
      birth_date: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("get_user_basic_profile")
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setAvatarUrl(data.user_avatar_url);
        
        form.reset({
          last_name: data.user_last_name || "",
          first_name: data.user_first_name || "",
          middle_name: data.user_middle_name || "",
          email: data.user_email || "",
          phone_display: data.user_phone || "",
          birth_date: data.user_birth_date || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить профиль",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
      });
      return;
    }

    // Open cropper with selected file (no size limit since we'll compress)
    setSelectedFile(file);
    setCropperOpen(true);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    try {
      setUploading(true);

      // Delete old avatar if exists
      if (avatarUrl) {
        // Extract path from URL: .../avatars/avatars/USER_ID.jpg?v=... -> avatars/USER_ID.jpg
        const urlPath = new URL(avatarUrl, window.location.origin).pathname;
        const match = urlPath.match(/\/avatars\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
          const pathInBucket = match[1].split('?')[0];
          await supabase.storage
            .from('avatars')
            .remove([pathInBucket]);
        }
      }

      // Upload new avatar
      const fileName = `${user.id}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: versionedUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(versionedUrl);
      setSelectedFile(null);

      toast({
        title: "Успешно",
        description: "Фото профиля обновлено",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось загрузить фото",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          last_name: data.last_name,
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          full_name: `${data.last_name} ${data.first_name}${data.middle_name ? ' ' + data.middle_name : ''}`,
          email: data.email,
          phone: data.phone_display || null,
          birth_date: data.birth_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Успешно",
        description: "Профиль обновлен",
      });

      fetchProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-6 w-full overflow-x-hidden">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="truncate">Настройки профиля</CardTitle>
            <CardDescription className="truncate">
              Управляйте информацией вашего профиля
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 w-full">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.user_full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <label htmlFor="avatar-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Изменить фото
                      </>
                    )}
                  </Button>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG или GIF (автосжатие)
                </p>
              </div>
              
              <AvatarCropper
                open={cropperOpen}
                onOpenChange={setCropperOpen}
                imageFile={selectedFile}
                onCropComplete={handleCropComplete}
              />
            </div>

            {/* Position (read-only) */}
            {profile.user_position && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-1">Должность</div>
                <div className="text-base">{profile.user_position}</div>
              </div>
            )}

            {/* Salary (read-only) */}
            {profile.user_salary && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-1">Оклад</div>
                <div className="text-base font-semibold">{formatCurrency(profile.user_salary)}</div>
              </div>
            )}

            {/* Profile Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Иванов" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Иван" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middle_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отчество (необязательно)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Иванович" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_display"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <PhoneInputRU 
                          value={field.value}
                          onChange={(result) => field.onChange(result.display)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата рождения</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      "Сохранить изменения"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Sign Out Button for Mobile */}
        <Card className="w-full mt-4">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти из системы
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;
