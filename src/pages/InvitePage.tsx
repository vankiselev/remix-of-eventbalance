// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputRU, toE164, normalizePhone } from "@/components/ui/phone-input-ru";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Camera, X } from "lucide-react";
import { AvatarCropper } from "@/components/ui/avatar-cropper";
import { DefaultAvatarPicker, getDefaultAvatarUrl, DEFAULT_AVATARS } from "@/components/invite/DefaultAvatarPicker";

const registrationSchema = z.object({
  lastName: z.string().min(1, "Фамилия обязательна").max(100),
  firstName: z.string().min(1, "Имя обязательно").max(100),
  middleName: z.string().min(1, "Отчество обязательно").max(100),
  phone: z.string().min(5, "Введите корректный телефон").max(20),
  birthDate: z.string().min(1, "Дата рождения обязательна"),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Пароль должен содержать буквы и цифры"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface InvitationData {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  expires_at: string;
  status: string;
}

export function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: "",
      phone: "",
      birthDate: "",
      password: "",
      confirmPassword: "",
    },
  });

  const token = searchParams.get("token");

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        toast({
          title: "Ошибка",
          description: "Некорректная ссылка приглашения",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_invitation_by_token', { invitation_token: token });

        if (error || !data || data.length === 0) {
          toast({
            title: "Ошибка",
            description: "Приглашение не найдено или уже использовано",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        setInvitation(data[0]);
      } catch (error) {
        console.error("Error validating invitation:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось проверить приглашение",
          variant: "destructive",
        });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token, navigate, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperOpen(true);
      setSelectedDefaultAvatar(null);
    }
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(blob));
    setSelectedDefaultAvatar(null);
  };

  const handleSelectDefaultAvatar = (avatarId: string) => {
    setSelectedDefaultAvatar(avatarId);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setSelectedDefaultAvatar(null);
  };

  const getAvatarDisplay = () => {
    if (avatarPreview) return avatarPreview;
    if (selectedDefaultAvatar) {
      const avatar = DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatar);
      return avatar ? null : null; // We'll use the emoji fallback
    }
    return null;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!invitation) return;

    try {
      setIsSubmitting(true);

      const fullName = `${data.lastName} ${data.firstName} ${data.middleName}`.trim();

      // Prepare avatar: convert file to base64 or use default avatar URL
      let avatarBase64: string | null = null;
      let avatarUrl: string | null = null;
      
      if (avatarFile) {
        avatarBase64 = await fileToBase64(avatarFile);
      } else if (selectedDefaultAvatar) {
        avatarUrl = getDefaultAvatarUrl(selectedDefaultAvatar);
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('register-invited-user', {
        body: {
          email: invitation.email,
          password: data.password,
          full_name: fullName,
          first_name: data.firstName,
          last_name: data.lastName,
          middle_name: data.middleName,
          phone: data.phone,
          birth_date: data.birthDate,
          avatar_url: avatarUrl,
          avatar_base64: avatarBase64,
          role: invitation.role,
          invitation_token: token,
        },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      toast({
        title: "Добро пожаловать!",
        description: "Ваш аккаунт успешно создан.",
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: data.password,
      });

      if (signInError) {
        console.error("Auto sign-in error:", signInError);
        navigate("/auth");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось принять приглашение",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Проверка приглашения...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Приглашение не найдено</div>
      </div>
    );
  }

  const selectedDefaultAvatarData = selectedDefaultAvatar 
    ? DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatar) 
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <p className="text-sm text-muted-foreground">
            Добро пожаловать в EventBalance!<br />
            {invitation.email}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Avatar section */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} />
                    ) : null}
                    <AvatarFallback className={selectedDefaultAvatarData ? selectedDefaultAvatarData.bg : 'bg-muted'}>
                      {selectedDefaultAvatarData ? (
                        <span className="text-3xl">{selectedDefaultAvatarData.emoji}</span>
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {(avatarPreview || selectedDefaultAvatar) && (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Загрузить фото
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <DefaultAvatarPicker
                  selected={selectedDefaultAvatar}
                  onSelect={handleSelectDefaultAvatar}
                />
              </div>

              {/* Name fields */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Иванов" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Иван" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отчество *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Иванович" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон *</FormLabel>
                    <FormControl>
                      <PhoneInputRU
                        value={field.value}
                        onChange={(result) => field.onChange(result.e164 || result.display)}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата рождения *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password fields */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Минимум 8 символов"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтверждение пароля *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Повторите пароль"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Создание аккаунта..." : "Создать аккаунт"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AvatarCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageFile={cropperFile}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
