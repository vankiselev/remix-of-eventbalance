// Modern currency formatting utility for EventBalance
export const formatCurrency = (amount: number, showKopecks: boolean = false): string => {
  // Handle edge cases
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0 ₽";
  }

  // Check if amount has kopecks (cents)
  const hasKopecks = !showKopecks && (amount % 1 !== 0);
  const shouldShowKopecks = showKopecks || hasKopecks;

  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: shouldShowKopecks ? 2 : 0,
    maximumFractionDigits: shouldShowKopecks ? 2 : 0,
  };

  // Format with Russian locale for proper spacing (300 000)
  const formatted = new Intl.NumberFormat('ru-RU', options).format(amount);
  
  // Ensure proper spacing for thousands
  const withSpaces = formatted.replace(/\s/g, ' '); // Ensure non-breaking spaces
  
  return `${withSpaces} ₽`;
};

// Format amount without currency symbol
export const formatAmount = (amount: number, showKopecks: boolean = false): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0";
  }

  const hasKopecks = !showKopecks && (amount % 1 !== 0);
  const shouldShowKopecks = showKopecks || hasKopecks;

  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: shouldShowKopecks ? 2 : 0,
    maximumFractionDigits: shouldShowKopecks ? 2 : 0,
  };

  return new Intl.NumberFormat('ru-RU', options).format(amount);
};

// Get color class for money display
export const getMoneyColorClass = (amount: number): string => {
  if (amount > 0) return "money-positive";
  if (amount < 0) return "money-negative";
  return "money-neutral";
};

// Format compact currency for dashboard cards
export const formatCompactCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `${formatAmount(amount / 1000000)} млн ₽`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${formatAmount(amount / 1000)} тыс ₽`;
  }
  return formatCurrency(amount);
};