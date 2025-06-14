import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, User, Lock, Mail, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    username: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Validation
      if (!formData.email || !formData.password || !formData.name || !formData.username) {
        setError('لطفاً تمام فیلدها را پر کنید');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('رمز عبور و تکرار آن مطابقت ندارند');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
        return;
      }
      
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            username: formData.username
          }
        }
      });
      
      if (signUpError) {
        console.error('Signup error:', signUpError);
        
        if (signUpError.message.includes('User already registered')) {
          setError('این ایمیل قبلاً ثبت شده است');
        } else if (signUpError.message.includes('Password should be at least')) {
          setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
        } else {
          setError('خطا در ثبت‌نام');
        }
        return;
      }
      
      if (data.user) {
        // Create user profile in our users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: formData.email,
            username: formData.username,
            name: formData.name,
            role: 'technician', // Default role
            active: true,
            permissions: {
              canViewReceptions: false,
              canCreateTask: false,
              canCreateReception: false,
              canCompleteServices: false,
              canManageCustomers: false,
              canViewHistory: false
            }
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          setError('خطا در ایجاد پروفایل کاربری');
          return;
        }
        
        toast.success('ثبت‌نام با موفقیت انجام شد! لطفاً ایمیل خود را بررسی کنید');
        navigate('/login');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('خطا در برقراری ارتباط با سرور');
      toast.error('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-10 animate-slide-in">
          <div className="flex flex-col items-center justify-center mb-8">
            <Logo className="h-20 w-20 mb-4" showSlogan={true} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
              ثبت‌نام در سیستم
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              ایجاد حساب کاربری جدید
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                نام و نام خانوادگی
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <User size={16} className="text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input pr-10"
                  placeholder="نام و نام خانوادگی"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                نام کاربری
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <UserPlus size={16} className="text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input pr-10"
                  placeholder="نام کاربری"
                  dir="ltr"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ایمیل
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input pr-10"
                  placeholder="ایمیل"
                  dir="ltr"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                رمز عبور
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="رمز عبور (حداقل ۶ کاراکتر)"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                تکرار رمز عبور
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input pr-10"
                  placeholder="تکرار رمز عبور"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 flex items-center pl-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} className="text-gray-400" />
                  ) : (
                    <Eye size={16} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                fullWidth
              >
                ثبت‌نام
              </Button>
            </div>

            <div className="text-sm text-center">
              <p className="text-gray-500 dark:text-gray-400">
                قبلاً حساب کاربری دارید؟{' '}
                <Link to="/login" className="text-accent hover:underline font-medium">
                  ورود
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;