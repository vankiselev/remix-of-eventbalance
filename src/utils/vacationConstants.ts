export const vacationTypeLabels: Record<string, string> = {
  weekend: "Выходной",
  vacation: "Отпуск",
  sick: "Больничный",
  personal: "Личное",
  fun: "Кайфануть",
  study: "Учеба",
};

export const vacationTypeColors: Record<string, string> = {
  weekend: "bg-purple-100 text-purple-800",
  vacation: "bg-green-100 text-green-800",
  sick: "bg-red-100 text-red-800",
  personal: "bg-blue-100 text-blue-800",
  fun: "bg-orange-100 text-orange-800",
  study: "bg-yellow-100 text-yellow-800",
};

export const vacationStatusLabels: Record<string, string> = {
  pending: "Ожидание",
  approved: "Одобрено",
  rejected: "Отклонено",
};

export const vacationStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

// Lowercase versions for conflict components (describes state, not label)
export const vacationTypeConflictLabels: Record<string, string> = {
  weekend: "выходной",
  vacation: "в отпуске",
  sick: "на больничном",
  personal: "по личным делам",
  fun: "в выходном",
  study: "на учебе",
};

export const vacationTypeConflictBadgeLabels: Record<string, string> = {
  weekend: "Выходной",
  vacation: "В отпуске",
  sick: "На больничном",
  personal: "По личным делам",
  fun: "Выходной",
  study: "На учебе",
};

export const getVacationTypeLabel = (type: string): string => {
  return vacationTypeLabels[type] || type;
};

export const getVacationTypeColor = (type: string): string => {
  return vacationTypeColors[type] || "bg-gray-100 text-gray-800";
};

export const getVacationStatusLabel = (status: string): string => {
  return vacationStatusLabels[status] || status;
};

export const getVacationStatusColor = (status: string): string => {
  return vacationStatusColors[status] || "bg-gray-100 text-gray-800";
};

export const calculateVacationDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};
