// Utility functions for currency formatting according to the specification

export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0 ₽';
  
  // Never show decimals - always whole rubles
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(numAmount));
  
  return `${formatted} ₽`;
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbol and spaces, replace commas with dots
  const cleaned = value.replace(/[₽\s]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};