-- Create user_voice_settings table for storing voice transaction preferences
CREATE TABLE public.user_voice_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_wallet TEXT DEFAULT 'Наличка Настя',
  default_project_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  auto_create_draft BOOLEAN DEFAULT true,
  preferred_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_voice_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can view own voice settings"
  ON public.user_voice_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice settings"
  ON public.user_voice_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice settings"
  ON public.user_voice_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice settings"
  ON public.user_voice_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_voice_settings_updated_at
  BEFORE UPDATE ON public.user_voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();