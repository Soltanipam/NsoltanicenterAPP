import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import moment from 'moment-jalaali';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  showTime?: boolean;
}

const DatePicker = ({ value, onChange, className = '', showTime = false }: DatePickerProps) => {
  const [date, setDate] = useState(value || moment().format('jYYYY/jMM/jDD'));
  const [time, setTime] = useState(moment().format('HH:mm'));

  const handleIncrement = () => {
    const newDate = moment(date, 'jYYYY/jMM/jDD').add(1, 'days').format('jYYYY/jMM/jDD');
    setDate(newDate);
    handleChange(newDate, time);
  };

  const handleDecrement = () => {
    const newDate = moment(date, 'jYYYY/jMM/jDD').subtract(1, 'days').format('jYYYY/jMM/jDD');
    setDate(newDate);
    handleChange(newDate, time);
  };

  const handleChange = (newDate: string, newTime: string) => {
    const fullDateTime = showTime ? `${newDate} ${newTime}` : newDate;
    onChange(fullDateTime);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronRight size={16} />
      </button>
      
      <input
        type="text"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          handleChange(e.target.value, time);
        }}
        className="input text-center w-32"
        placeholder="1404/01/01"
      />
      
      {showTime && (
        <input
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            handleChange(date, e.target.value);
          }}
          className="input text-center w-24"
        />
      )}
      
      <button
        type="button"
        onClick={handleIncrement}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
};

export default DatePicker;