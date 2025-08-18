// Currency formatting utility following the specification
export const formatCurrency = (amount: number, showKopecks: boolean = false): string => {
  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: showKopecks ? 2 : 0,
    maximumFractionDigits: showKopecks ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat('ru-RU', options).format(amount);
  return `${formatted} ₽`;
};

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU').format(amount);
};