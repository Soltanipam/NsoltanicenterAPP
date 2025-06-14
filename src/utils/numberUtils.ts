// Utility functions for number conversion and formatting
export const persianToEnglish = (str: string): string => {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < persianNumbers.length; i++) {
    result = result.replace(new RegExp(persianNumbers[i], 'g'), englishNumbers[i]);
  }
  return result;
};

export const englishToPersian = (str: string): string => {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < englishNumbers.length; i++) {
    result = result.replace(new RegExp(englishNumbers[i], 'g'), persianNumbers[i]);
  }
  return result;
};

export const formatLicensePlate = (plateNumber: string): string => {
  if (!plateNumber || plateNumber === 'نامشخص') return plateNumber;
  
  // Expected format: 12ا34567 (2 digits + letter + 3 digits + 2 digits)
  const match = plateNumber.match(/^(\d{2})([آ-ی])(\d{3})(\d{2})$/);
  if (match) {
    const [, firstNumber, letter, secondNumber, provinceCode] = match;
    return `${englishToPersian(firstNumber)} ${letter} ${englishToPersian(secondNumber)} - ${englishToPersian(provinceCode)}`;
  }
  
  return plateNumber;
};

// Format number with thousand separators (commas) and Persian digits
export const formatNumber = (num: number | string): string => {
  if (!num && num !== 0) return '';
  
  const numStr = num.toString().replace(/,/g, ''); // Remove existing commas
  const number = parseFloat(numStr);
  
  if (isNaN(number)) return '';
  
  const formatted = number.toLocaleString('en-US');
  return englishToPersian(formatted);
};

// Parse formatted number string to actual number
export const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  
  // Convert Persian to English first
  const englishStr = persianToEnglish(str);
  const cleanStr = englishStr.replace(/,/g, ''); // Remove commas
  const number = parseFloat(cleanStr);
  
  return isNaN(number) ? 0 : number;
};

// Format currency with Toman suffix and Persian numbers
export const formatCurrency = (amount: number | string): string => {
  const formatted = formatNumber(amount);
  return formatted ? `${formatted} تومان` : '۰ تومان';
};

// Handle input change for formatted number fields
export const handleNumberInput = (
  value: string,
  onChange: (value: number) => void
): string => {
  // Convert Persian to English first
  const englishValue = persianToEnglish(value);
  // Remove all non-digit characters except decimal point
  const cleanValue = englishValue.replace(/[^\d.]/g, '');
  
  // Parse to number and call onChange
  const numValue = parseFormattedNumber(cleanValue);
  onChange(numValue);
  
  // Return formatted string for display
  return formatNumber(numValue);
};

// Format Persian quantity
export const formatQuantity = (quantity: number): string => {
  return englishToPersian(quantity.toString());
};