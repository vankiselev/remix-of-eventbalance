import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CategoryIcon {
  id: string;
  category_name: string;
  icon_type: 'lucide' | 'upload' | 'url';
  icon_value: string;
  bg_color: string;
  icon_color: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useCategoryIcons = () => {
  const queryClient = useQueryClient();

  const { data: categoryIcons = [], isLoading } = useQuery({
    queryKey: ['category-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_icons')
        .select('*')
        .order('category_name');
      
      if (error) throw error;
      return data as CategoryIcon[];
    },
  });

  const updateCategoryIcon = useMutation({
    mutationFn: async (icon: Partial<CategoryIcon> & { id: string }) => {
      const { error } = await supabase
        .from('category_icons')
        .update({
          icon_type: icon.icon_type,
          icon_value: icon.icon_value,
          bg_color: icon.bg_color,
          icon_color: icon.icon_color,
        })
        .eq('id', icon.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-icons'] });
      toast.success('Иконка обновлена');
    },
    onError: (error) => {
      console.error('Error updating category icon:', error);
      toast.error('Ошибка при обновлении иконки');
    },
  });

  const uploadIconFile = async (file: File, categoryId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${categoryId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('category-icons')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('category-icons')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  return {
    categoryIcons,
    isLoading,
    updateCategoryIcon,
    uploadIconFile,
  };
};
