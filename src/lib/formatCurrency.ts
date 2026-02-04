/**
 * Format a number as Brazilian Real currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Parse a currency string to number
 */
export function parseCurrencyToNumber(value: string): number {
  // Remove currency symbol, dots (thousands) and replace comma with dot
  const cleaned = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format input value as currency while typing
 */
export function formatCurrencyInput(value: string): string {
  // Remove non-numeric characters except comma
  let cleaned = value.replace(/[^\d]/g, "");
  
  if (!cleaned) return "";
  
  // Convert to number (considering last 2 digits as cents)
  const numValue = parseInt(cleaned, 10) / 100;
  
  // Format as currency without symbol
  return numValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
