export const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Завершено",
  cancelled: "Отменено",
};

export const typeLabels: Record<string, string> = {
  collection: "Сбор",
  return: "Возврат",
};

export const typeIcons: Record<string, string> = {
  collection: "📦",
  return: "↩️",
};

export const typeFullLabels: Record<string, string> = {
  collection: "Сбор реквизита",
  return: "Возврат реквизита",
};
