import { Link } from 'react-router-dom';
import { Home, Car, ClipboardList, Users, Settings, Mail, UserCircle, CheckCircle, History, MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../ui/Logo';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  
  // Admin check - user with role 'admin' has access to everything
  const isAdmin = user?.role === 'admin';

  console.log('Current user:', user);
  console.log('Is admin:', isAdmin);
  console.log('User role:', user?.role);

  const navigation = [
    { 
      name: 'داشبورد',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard',
      show: true
    },
    { 
      name: 'پذیرش خودرو',
      href: '/dashboard/reception',
      icon: Car,
      current: location.pathname === '/dashboard/reception',
      show: isAdmin || (user?.permissions?.canCreateReception ?? false)
    },
    { 
      name: 'لیست پذیرش‌ها',
      href: '/dashboard/reception/list',
      icon: ClipboardList,
      current: location.pathname === '/dashboard/reception/list',
      show: isAdmin || (user?.permissions?.canViewReceptions ?? false)
    },
    { 
      name: 'تکمیل شده‌ها',
      href: '/dashboard/completed',
      icon: CheckCircle,
      current: location.pathname === '/dashboard/completed',
      show: isAdmin || (user?.permissions?.canViewReceptions ?? false)
    },
    { 
      name: 'کارتابل وظایف',
      href: '/dashboard/tasks',
      icon: ClipboardList,
      current: location.pathname === '/dashboard/tasks',
      show: true // Now visible for all users
    },
    { 
      name: 'تاریخچه',
      href: '/dashboard/history',
      icon: History,
      current: location.pathname === '/dashboard/history',
      show: isAdmin || (user?.permissions?.canViewHistory ?? false)
    },
    { 
      name: 'مدیریت کاربران',
      href: '/dashboard/users',
      icon: Users,
      current: location.pathname === '/dashboard/users',
      show: isAdmin // Only admin can access user management
    },
    {
      name: 'مدیریت مشتریان',
      href: '/dashboard/customers',
      icon: UserCircle,
      current: location.pathname === '/dashboard/customers',
      show: isAdmin || (user?.permissions?.canManageCustomers ?? false)
    },
    {
      name: 'مدیریت پیامک',
      href: '/dashboard/sms',
      icon: MessageSquare,
      current: location.pathname === '/dashboard/sms',
      show: isAdmin // Only admin can access SMS management
    },
    {
      name: 'پیام‌ها',
      href: '/dashboard/messages',
      icon: Mail,
      current: location.pathname === '/dashboard/messages',
      show: true
    },
    {
      name: 'تنظیمات',
      href: '/dashboard/settings',
      icon: Settings,
      current: location.pathname === '/dashboard/settings',
      show: true
    }
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-lg z-30 transition-all duration-300 ${
          open ? 'translate-x-0 w-64' : 'w-16 translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Logo className={open ? "h-8 w-8" : "h-10 w-10"} />
            {open && <h2 className="font-bold text-lg">سلطانی سنتر</h2>}
          </div>
        </div>

        <nav className="p-4 flex flex-col justify-between h-[calc(100%-80px)]">
          <ul className="space-y-2">
            {navigation.map((item) => {
              console.log(`Menu item: ${item.name}, Show: ${item.show}, Is Admin: ${isAdmin}`);
              return item.show && (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      item.current 
                        ? 'bg-accent text-white' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={!open ? item.name : undefined}
                  >
                    <item.icon className={open ? "h-5 w-5" : "h-8 w-8"} />
                    {open && <span className="mr-3">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={!open ? (theme === 'light' ? 'حالت تاریک' : 'حالت روشن') : undefined}
            >
              <Settings className={open ? "h-5 w-5" : "h-8 w-8"} />
              {open && (
                <span className="mr-3">
                  {theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}
                </span>
              )}
            </button>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              {open && <span>نسخه ۱.۰.۰ &copy; ۱۴۰۴</span>}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}