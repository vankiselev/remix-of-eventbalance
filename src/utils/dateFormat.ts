import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Format date in Russian DD.MM.YYYY format
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd.MM.yyyy', { locale: ru });
};

// Format date with time in Russian format
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd.MM.yyyy HH:mm', { locale: ru });
};

// Format date for display (e.g., "25 августа 2025")
export const formatDateDisplay = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'd MMMM yyyy', { locale: ru });
};

// Format date for calendar header
export const formatMonthYear = (date: Date): string => {
  return format(date, 'LLLL yyyy', { locale: ru });
};