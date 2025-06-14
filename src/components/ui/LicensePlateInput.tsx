import { useState } from 'react';
import { persianToEnglish } from '../../utils/numberUtils';

interface LicensePlateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PERSIAN_LETTERS = ['الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ژ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی'];

const PROVINCES = [
  { code: '11', name: 'تهران' },
  { code: '10', name: 'البرز' },
  { code: '13', name: 'اصفهان' },
  { code: '12', name: 'فارس' },
  { code: '14', name: 'خراسان رضوی' },
  { code: '15', name: 'آذربایجان شرقی' },
  { code: '16', name: 'آذربایجان غربی' },
  { code: '17', name: 'کرمانشاه' },
  { code: '18', name: 'خوزستان' },
  { code: '19', name: 'گیلان' },
  { code: '20', name: 'مازندران' },
  { code: '21', name: 'کرمان' },
  { code: '22', name: 'همدان' },
  { code: '23', name: 'یزد' },
  { code: '24', name: 'سیستان و بلوچستان' },
  { code: '25', name: 'اردبیل' },
  { code: '26', name: 'بوشهر' },
  { code: '27', name: 'زنجان' },
  { code: '28', name: 'سمنان' },
  { code: '29', name: 'کردستان' },
  { code: '30', name: 'قزوین' },
  { code: '31', name: 'لرستان' },
  { code: '32', name: 'گلستان' },
  { code: '33', name: 'مرکزی' },
  { code: '34', name: 'هرمزگان' },
  { code: '35', name: 'چهارمحال و بختیاری' },
  { code: '36', name: 'قم' },
  { code: '37', name: 'کهگیلویه و بویراحمد' },
  { code: '38', name: 'خراسان شمالی' },
  { code: '39', name: 'خراسان جنوبی' },
  { code: '40', name: 'ایلام' }
];

const LicensePlateInput = ({ value, onChange, className = '' }: LicensePlateInputProps) => {
  const [parts, setParts] = useState(() => {
    const match = value.match(/^(\d{2})([آ-ی])(\d{3})(\d{2})$/);
    return {
      firstNumber: match?.[1] || '',
      letter: match?.[2] || '',
      secondNumber: match?.[3] || '',
      provinceCode: match?.[4] || ''
    };
  });

  const handlePartChange = (part: keyof typeof parts, newValue: string) => {
    // Convert Persian numbers to English for numeric parts
    let processedValue = newValue;
    if (part !== 'letter') {
      processedValue = persianToEnglish(newValue);
    }
    
    const newParts = { ...parts, [part]: processedValue };
    setParts(newParts);
    
    const fullPlate = `${newParts.firstNumber}${newParts.letter}${newParts.secondNumber}${newParts.provinceCode}`;
    onChange(fullPlate);
  };

  // Generate numbers from 111 to 999 for the second number part
  const generateSecondNumbers = () => {
    const numbers = [];
    for (let i = 111; i <= 999; i++) {
      numbers.push(i.toString());
    }
    return numbers;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Province Code - rightmost */}
      <select
        value={parts.provinceCode}
        onChange={(e) => handlePartChange('provinceCode', e.target.value)}
        className="input w-20 text-center"
      >
        <option value="">کد</option>
        {PROVINCES.map(province => (
          <option key={province.code} value={province.code}>
            {province.code}
          </option>
        ))}
      </select>

      <span className="text-gray-400">-</span>

      {/* Second Number (3 digits) */}
      <select
        value={parts.secondNumber}
        onChange={(e) => handlePartChange('secondNumber', e.target.value)}
        className="input w-24 text-center"
      >
        <option value="">شماره</option>
        {generateSecondNumbers().map(num => (
          <option key={num} value={num}>{num}</option>
        ))}
      </select>

      {/* Letter */}
      <select
        value={parts.letter}
        onChange={(e) => handlePartChange('letter', e.target.value)}
        className="input w-16 text-center"
      >
        <option value="">حرف</option>
        {PERSIAN_LETTERS.map(letter => (
          <option key={letter} value={letter}>{letter}</option>
        ))}
      </select>

      {/* First Number (2 digits) - leftmost */}
      <select
        value={parts.firstNumber}
        onChange={(e) => handlePartChange('firstNumber', e.target.value)}
        className="input w-16 text-center"
      >
        <option value="">شماره</option>
        {Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0')).map(num => (
          <option key={num} value={num}>{num}</option>
        ))}
      </select>
    </div>
  );
};

export default LicensePlateInput;