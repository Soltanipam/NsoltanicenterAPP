import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertCircle, Wifi, WifiOff, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { googleAuthService } from '../../services/googleAuth';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { offlineSyncService } from '../../services/offlineSync';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const { login, connectionStatus, checkConnection, initialize } = useAuthStore();
  
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      await googleAuthService.signIn();
      toast.success('در حال هدایت به Google...');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('خطا در ورود با Google');
      toast.error('خطا در ورود با Google');
    } finally {
      setGoogleLoading(false);
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

          {/* Google Sign In Button */}
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleSignIn}
              isLoading={googleLoading}
              fullWidth
              disabled={googleLoading || loading}
              className="flex items-center justify-center gap-3 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              ورود با Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">یا</span>
            </div>
          </div>

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
                    برای اتصال به Google Sheets، ابتدا با Google وارد شوید
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                نام کاربری یا ایمیل
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
                  placeholder="نام کاربری یا ایمیل خود را وارد کنید"
                  disabled={loading || googleLoading}
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
                  disabled={loading || googleLoading}
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
                disabled={loading || googleLoading}
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
                  disabled={loading || googleLoading}
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
                <strong>حالت آفلاین:</strong> برای اتصال به Google Sheets، ابتدا با Google وارد شوید. 
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