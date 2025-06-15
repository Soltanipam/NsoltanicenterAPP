import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertCircle, Wifi, WifiOff, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { offlineSyncService } from '../../services/offlineSync';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const { login, connectionStatus, checkConnection, initialize, isInitialized } = useAuthStore();
  
  useEffect(() => {
    initializeAuth();
  }, []);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.username || !formData.password) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید');
      setLoading(false);
      return;
    }
    
    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        toast.success('با موفقیت وارد شدید');
        navigate('/dashboard');
      } else {
        setError(result.message || 'خطا در ورود به سیستم');
        toast.error(result.message || 'خطا در ورود به سیستم');
      }
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-lg">در حال بارگذاری...</p>
          <p className="text-sm text-gray-500 mt-2">آماده‌سازی سیستم</p>
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
                    متصل به Google Sheets
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

          {/* Login Instructions */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                  اطلاعات ورود پیش‌فرض:
                </p>
                <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                  <p><strong>نام کاربری:</strong> admin</p>
                  <p><strong>رمز عبور:</strong> admin123</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    برای اتصال به Google Sheets، API Key را در فایل .env تنظیم کنید
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                نام کاربری
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <User size={16} className="text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input pr-10 focus:ring-accent focus:border-accent"
                  placeholder="نام کاربری خود را وارد کنید"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                رمز عبور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10 pl-10 focus:ring-accent focus:border-accent"
                  placeholder="رمز عبور خود را وارد کنید"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 flex items-center pl-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-gray-400" />
                  ) : (
                    <Eye size={16} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                fullWidth
                disabled={loading}
              >
                ورود به سیستم
              </Button>
            </div>

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
          </form>

          {/* Offline Mode Info */}
          {connectionStatus === 'disconnected' && (
            <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>حالت آفلاین:</strong> برای اتصال به Google Sheets، API Key را در فایل .env تنظیم کنید. 
                پس از ورود، می‌توانید در حالت آفلاین کار کنید.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;