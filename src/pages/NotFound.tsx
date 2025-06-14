import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-accent mb-4">۴۰۴</h1>
        <h2 className="text-2xl font-semibold mb-2">صفحه مورد نظر یافت نشد</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          متأسفانه صفحه‌ای که به دنبال آن بودید پیدا نشد.
        </p>
        <Button 
          onClick={() => navigate('/')}
          variant="primary"
          leftIcon={<Home size={16} />}
        >
          بازگشت به صفحه اصلی
        </Button>
      </div>
    </div>
  );
};

export default NotFound;