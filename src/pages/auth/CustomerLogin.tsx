import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { User, Phone, Car, AlertCircle } from 'lucide-react';
import { useCustomerAuthStore } from '../../store/customerAuthStore';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { persianToEnglish } from '../../utils/numberUtils';

const CustomerLogin = () => {
  const [customerCode, setCustomerCode] = useState('');
  const [mobile, setMobile] = useState('');
  
  const { login, isLoading, error, clearError } = useCustomerAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!customerCode || !mobile) {
      toast.error('لطفاً کد مشتری و شماره موبایل را وارد کنید');
      return;
    }
    
    // Convert Persian numbers to English
    const englishCustomerCode = persianToEnglish(customerCode);
    const englishMobile = persianToEnglish(mobile);
    
    console.log('Attempting customer login with code:', englishCustomerCode);
    
    const result = await login(englishCustomerCode, englishMobile);
    
    if (result.success) {
      toast.success('با موفقیت وارد شدید');
      navigate('/customer-dashboard');
    } else {
      toast.error(result.message || 'خطا در ورود به سیستم');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-10 animate-slide-in">
          <div className="flex flex-col items-center justify-center mb-8">
            <Logo className="h-24 w-24 mb-4" showSlogan={true} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
              پورتال مشتریان سلطانی سنتر
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              پیگیری وضعیت تعمیر خودرو
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Instructions */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-3">
              <User size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                  نحوه ورود:
                </p>
                <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                  <p><strong>کد مشتری:</strong> کد عددی که هنگام پذیرش به شما داده شده</p>
                  <p><strong>شماره موبایل:</strong> شماره موبایل شما</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    مثال: کد ۱۰۰۱ و موبایل ۰۹۱۲۳۴۵۶۷۸۹
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="customerCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                کد مشتری
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <User size={16} className="text-gray-400" />
                </div>
                <input
                  id="customerCode"
                  name="customerCode"
                  type="text"
                  required
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="input pr-10 focus:ring-accent focus:border-accent"
                  placeholder="کد مشتری خود را وارد کنید"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                شماره موبایل
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="input pr-10 focus:ring-accent focus:border-accent"
                  placeholder="شماره موبایل خود را وارد کنید"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                fullWidth
                leftIcon={<Car size={16} />}
                disabled={isLoading}
              >
                ورود به پورتال مشتری
              </Button>
            </div>

            <div className="text-sm text-center text-gray-500 dark:text-gray-400">
              <p>کد مشتری و شماره موبایل خود را از پذیرش دریافت کنید</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-accent hover:underline mt-2"
                disabled={isLoading}
              >
                ورود کارکنان
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;