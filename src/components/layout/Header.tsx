import { Menu, LogOut, User, Car, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const { user, logout } = useAuthStore();
  const { getUnreadCount } = useMessageStore();
  
  const unreadCount = user ? getUnreadCount(user.auth_user_id) : 0;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-primary text-white shadow-md z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md hover:bg-primary-700"
              aria-label="منو"
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden md:flex items-center gap-2">
              <Logo className="h-16 w-16" />
              <h1 className="text-lg font-bold tracking-wider">سلطانی سنتر</h1>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold">برترین‌ها برای بهترین‌ها</p>
              <p className="text-sm text-gray-200">Finest for the best</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard/messages" 
              className="p-2 rounded-full hover:bg-primary-700 relative"
              aria-label="پیام‌ها"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            
            <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-md">
              <User size={20} />
              <div className="text-right">
                <span className="block">{user?.name || 'کاربر'}</span>
                <span className="text-xs text-gray-200">
                  {user?.role === 'admin' ? 'مدیر' : 
                   user?.role === 'receptionist' ? 'پذیرش' : 
                   user?.role === 'technician' ? 'تکنسین' : 
                   user?.role === 'warehouse' ? 'انباردار' : 
                   user?.role === 'detailing' ? 'دیتیلینگ' : 
                   user?.role === 'accountant' ? 'حسابدار' : ''}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-danger px-3 py-1.5 rounded-md hover:bg-danger/90 transition duration-200"
              aria-label="خروج"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;