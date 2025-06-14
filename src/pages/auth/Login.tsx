import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { offlineSyncService } from '../../services/offlineSync';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { login, handleAuthCallback, connectionStatus, checkConnection, initialize } = useAuthStore();
  
  // بررسی callback از Google OAuth
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleGoogleCallback(code);
    } else {
      initializeAuth();
    }
  }, [searchParams]);

  const initializeAuth = async () => {
    try {
      console.log('Initializing authentication...');
      await initialize();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setError('خطا در راه‌اندازی اولیه سیستم');
      toast.error('خطا در راه‌اندازی اولیه سیستم');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGoogleCallback = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await handleAuthCallback(code);
      
      if (result.success) {
        toast.success('با موفقیت وارد شدید');
        navigate('/dashboard');
      } else {
        setError(result.message || 'خطا در ورود به سیستم');
        toast.error(result.message || 'خطا در ورود به سیستم');
        // پاک کردن URL
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('Callback error:', err);
      setError('خطا در تکمیل احراز هویت');
      toast.error('خطا در تکمیل احراز هویت');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
      setIsInitializing(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const result = await login();
      
      if (!result.success) {
        setError(result.message || 'خطا در ورود به سیستم');
        toast.error(result.message || 'خطا در ورود به سیستم');
      }
      // در صورت موفقیت، کاربر به Google هدایت می‌شود
    } catch (err) {
      console.error('Login error:', err);
      setError('خطا در برقراری ارتباط با سرور');
      toast.error('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setError('');
    setIsInitializing(true);
    
    try {
      const isConnected = await checkConnection();
      if (isConnected) {
        toast.success('اتصال برقرار شد');
        await initialize();
        // تلاش برای sync داده‌های آفلاین
        await offlineSyncService.syncPendingActions();
      } else {
        setError('همچنان خطا در اتصال به سرور وجود دارد');
        toast.error('خطا در اتصال به سرور');
      }
    } catch (error) {
      console.error('Retry connection error:', error);
      setError('خطا در اتصال مجدد به سرور');
      toast.error('خطا در اتصال مجدد');
    } finally {
      setIsInitializing(false);
    }
  };
  
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10 text-center">
            <Logo className="h-24 w-24 mb-4 mx-auto" showSlogan={true} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              راه‌اندازی سیستم
            </h1>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              لطفاً صبر کنید...
            </p>
            
            {/* Connection status indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {connectionStatus === 'checking' && (
                <>
                  <Wifi className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    بررسی اتصال...
                  </span>
                </>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    متصل
                  </span>
                </>
              )}
              {connectionStatus === 'disconnected' && (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    قطع اتصال
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-10 animate-slide-in">
          <div className="flex flex-col items-center justify-center mb-8">
            <Logo className="h-24 w-24 mb-4" showSlogan={true} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
              سیستم جامع سلطانی سنتر
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              ورود کارکنان
            </p>
            
            {/* Connection status indicator */}
            <div className="mt-3 flex items-center gap-2">
              {connectionStatus === 'checking' && (
                <>
                  <Wifi className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    بررسی اتصال...
                  </span>
                </>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    متصل
                  </span>
                </>
              )}
              {connectionStatus === 'disconnected' && (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    قطع اتصال - حالت آفلاین
                  </span>
                </>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={retryConnection}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  تلاش مجدد
                </button>
              )}
            </div>
          )}

          {/* Google Sign-In Info */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                  ورود با حساب Google:
                </p>
                <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                  <p>• برای ورود به سیستم از حساب Google خود استفاده کنید</p>
                  <p>• اولین کاربری که وارد شود، مدیر سیستم خواهد بود</p>
                  <p>• سایر کاربران با نقش تکنسین ثبت می‌شوند</p>
                  <p>• اطلاعات شما در Google Sheets ذخیره می‌شود</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <Button
              onClick={handleLogin}
              variant="primary"
              size="lg"
              isLoading={loading}
              fullWidth
              disabled={loading}
            >
              ورود با Google
            </Button>

            <div className="text-sm text-center space-y-3">
              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/customer-login')}
                  className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
                  disabled={loading}
                >
                  ورود مشتریان
                </button>
              </div>
            </div>
          </div>

          {/* Offline Mode Info */}
          {connectionStatus === 'disconnected' && (
            <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>حالت آفلاین:</strong> برای ورود اولیه اتصال اینترنت ضروری است. 
                پس از ورود اولیه، می‌توانید در حالت آفلاین کار کنید.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;