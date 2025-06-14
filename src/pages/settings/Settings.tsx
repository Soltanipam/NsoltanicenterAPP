import { useState } from 'react';
import { Moon, Sun, SidebarClose, SidebarOpen } from 'lucide-react';
import Card from '../../components/ui/Card';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, updateUserSettings } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(user?.settings?.sidebarOpen ?? true);

  const handleSidebarToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    updateUserSettings({ sidebarOpen: newState });
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-gray-600 dark:text-gray-400">تنظیمات و شخصی‌سازی سیستم</p>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">ظاهر و نمایش</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">حالت تاریک/روشن</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تغییر رنگ‌بندی سیستم به حالت تاریک یا روشن
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">نمایش منوی کناری</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تنظیم حالت نمایش منوی کناری
                </p>
              </div>
              <button
                onClick={handleSidebarToggle}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {sidebarOpen ? <SidebarClose size={24} /> : <SidebarOpen size={24} />}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">اطلاعات کاربری</h2>
          <div className="space-y-2">
            <p>
              <span className="text-gray-500 dark:text-gray-400">نام کاربری: </span>
              {user?.username}
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-400">نام و نام خانوادگی: </span>
              {user?.name}
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-400">نقش: </span>
              {user?.role === 'admin' ? 'مدیر' :
               user?.role === 'receptionist' ? 'پذیرش' :
               user?.role === 'technician' ? 'تکنسین' :
               user?.role === 'warehouse' ? 'انباردار' :
               user?.role === 'detailing' ? 'دیتیلینگ' :
               user?.role === 'accountant' ? 'حسابدار' : user?.role}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;