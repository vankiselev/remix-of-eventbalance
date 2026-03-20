import { cn } from "@/lib/utils";

const DEFAULT_AVATARS = [
  { id: 'gradient-1', bg: 'bg-gradient-to-br from-rose-400 to-orange-300', emoji: '🎭' },
  { id: 'gradient-2', bg: 'bg-gradient-to-br from-violet-400 to-purple-300', emoji: '🎪' },
  { id: 'gradient-3', bg: 'bg-gradient-to-br from-cyan-400 to-blue-300', emoji: '🎬' },
  { id: 'gradient-4', bg: 'bg-gradient-to-br from-emerald-400 to-teal-300', emoji: '🎯' },
  { id: 'gradient-5', bg: 'bg-gradient-to-br from-amber-400 to-yellow-300', emoji: '⭐' },
  { id: 'gradient-6', bg: 'bg-gradient-to-br from-pink-400 to-fuchsia-300', emoji: '🎨' },
  { id: 'gradient-7', bg: 'bg-gradient-to-br from-sky-400 to-indigo-300', emoji: '🚀' },
  { id: 'gradient-8', bg: 'bg-gradient-to-br from-lime-400 to-green-300', emoji: '🌟' },
];

interface DefaultAvatarPickerProps {
  selected: string | null;
  onSelect: (avatarId: string) => void;
}

export function DefaultAvatarPicker({ selected, onSelect }: DefaultAvatarPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Или выберите стандартную аватарку:</p>
      <div className="grid grid-cols-4 gap-3">
        {DEFAULT_AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all",
              avatar.bg,
              selected === avatar.id
                ? "ring-2 ring-primary ring-offset-2 scale-110"
                : "hover:scale-105 opacity-80 hover:opacity-100"
            )}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getDefaultAvatarUrl(avatarId: string): string {
  return `default-avatar://${avatarId}`;
}

export { DEFAULT_AVATARS };
