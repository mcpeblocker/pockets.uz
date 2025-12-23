// Common currency configurations
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
] as const;

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Format based on currency
  if (currencyCode === 'JPY' || currencyCode === 'KRW') {
    // No decimal places for yen and won
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
}
