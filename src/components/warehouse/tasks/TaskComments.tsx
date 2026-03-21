import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WarehouseTaskWithDetails, useWarehouseTasks } from "@/hooks/useWarehouseTasks";
import { useProfiles } from "@/hooks/useProfiles";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageSquare, Send, Image as ImageIcon } from "lucide-react";
import { formatDisplayName } from "@/utils/formatName";
import { useDropzone } from "react-dropzone";

interface TaskCommentsProps {
  task: WarehouseTaskWithDetails;
}

export const TaskComments = ({ task }: TaskCommentsProps) => {
  const { addComment } = useWarehouseTasks();
  const { data: profiles = [] } = useProfiles();
  const [newComment, setNewComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setPhoto(file);
        const reader = new FileReader();
        reader.onload = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  });

  const handleSubmit = () => {
    if (!newComment.trim() && !photo) return;

    addComment.mutate({
      task_id: task.id,
      comment: newComment,
      photo
    }, {
      onSuccess: () => {
        setNewComment("");
        setPhoto(null);
        setPhotoPreview(null);
      }
    });
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Пользователь';
  };

  const getProfileAvatar = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.avatar_url;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {!task.comments || task.comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет комментариев</p>
          </div>
        ) : (
          task.comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getProfileAvatar(comment.user_id)} />
                  <AvatarFallback>
                    {getProfileName(comment.user_id).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {getProfileName(comment.user_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                  {comment.photo_url && (
                    <img 
                      src={comment.photo_url} 
                      alt="Фото комментария"
                      className="rounded-lg max-w-sm max-h-64 object-cover"
                    />
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <Card className="p-4 space-y-3">
          <Textarea
            placeholder="Добавить комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />

          {photoPreview ? (
            <div className="relative">
              <img 
                src={photoPreview} 
                alt="Превью"
                className="rounded-lg max-h-48 object-cover"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
              >
                Удалить
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
            >
              <input {...getInputProps()} />
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Отпустите файл' : 'Перетащите фото или нажмите'}
              </p>
            </div>
          )}

          <Button 
            onClick={handleSubmit}
            disabled={(!newComment.trim() && !photo) || addComment.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Отправить
          </Button>
        </Card>
      )}
    </div>
  );
};
