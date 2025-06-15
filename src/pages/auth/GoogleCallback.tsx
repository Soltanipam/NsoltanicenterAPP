import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleAuthService } from '../../services/googleAuth';
import { toast } from 'react-hot-toast';
import Logo from '../../components/ui/Logo';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('خطا در احراز هویت Google');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('کد احراز هویت دریافت نشد');
        navigate('/login');
        return;
      }

      try {
        const result = await googleAuthService.handleCallback(code);
        
        if (result.success) {
          toast.success('احراز هویت Google موفق بود');
          // ذخیره token در localStorage برای استفاده در سیستم
          navigate('/login?google_auth=success');
        } else {
          toast.error(result.error || 'خطا در احراز هویت');
          navigate('/login');
        }
      } catch (error) {
        console.error('Callback error:', error);
        toast.error('خطا در پردازش احراز هویت');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-10 text-center">
          <Logo className="h-24 w-24 mb-4 mx-auto" showSlogan={true} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            در حال پردازش احراز هویت
          </h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            لطفاً صبر کنید...
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;