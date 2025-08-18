// Utility functions for currency formatting according to the specification

export const formatCurrency = (amount: number | string, showDecimals: boolean = false): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0 ₽';
  
  // Format with thousands separators and optional decimals
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(numAmount);
  
  return `${formatted} ₽`;
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbol and spaces, replace commas with dots
  const cleaned = value.replace(/[₽\s]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};