import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import GoogleCallback from './pages/auth/GoogleCallback';
import CustomerLogin from './pages/auth/CustomerLogin';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Dashboard from './pages/dashboard/Dashboard';
import VehicleReception from './pages/reception/VehicleReception';
import VehicleList from './pages/reception/VehicleList';
import CompletedReceptions from './pages/completed/CompletedReceptions';
import TaskManagement from './pages/tasks/TaskManagement';
import History from './pages/history/History.tsx';
import UserManagement from './pages/users/UserManagement';
import CustomerManagement from './pages/customers/CustomerManagement';
import SMSManagement from './pages/sms/SMSManagement';
import Messages from './pages/messages/Messages';
import Settings from './pages/settings/Settings';
import FormPage from './pages/forms/FormPage';
import NotFound from './pages/NotFound';
import { useAuthStore } from './store/authStore';
import { useCustomerAuthStore } from './store/customerAuthStore';
import { ThemeProvider } from './contexts/ThemeContext';
import { offlineSyncService } from './services/offlineSync';

function App() {
  const { isAuthenticated, user, updateUserSettings, initialize, isInitialized } = useAuthStore();
  const { isAuthenticated: isCustomerAuthenticated } = useCustomerAuthStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    // Initialize auth store on app start
    initialize();
    
    // Setup offline sync
    const handleOnline = () => {
      console.log('App is online, syncing pending actions...');
      offlineSyncService.syncPendingActions();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [initialize]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }

    // Load sidebar state from user settings
    if (user?.settings?.sidebarOpen !== undefined) {
      setSidebarOpen(user.settings.sidebarOpen);
    }
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    updateUserSettings({ sidebarOpen: open });
  };

  // Show loading screen while initializing
  if (!isInitialized) {
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
    <ThemeProvider value={{ theme, toggleTheme }}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <button 
          onClick={toggleTheme} 
          className="fixed left-4 bottom-4 z-50 p-2 rounded-full bg-primary text-white shadow-lg"
          aria-label="تغییر تم"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        {/* Offline indicator */}
        {!offlineSyncService.isConnected() && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
            حالت آفلاین - تغییرات پس از اتصال مجدد همگام‌سازی خواهند شد
          </div>
        )}
        
        <Routes>
          {/* Staff Login */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          
          {/* Google OAuth Callback - Deprecated but kept for compatibility */}
          <Route path="/auth/callback" element={<GoogleCallback />} />
          
          {/* Customer Login */}
          <Route path="/customer-login" element={isCustomerAuthenticated ? <Navigate to="/customer-dashboard" /> : <CustomerLogin />} />
          
          {/* Customer Dashboard */}
          <Route 
            path="/customer-dashboard" 
            element={isCustomerAuthenticated ? <CustomerDashboard /> : <Navigate to="/customer-login" />} 
          />
          
          {/* Public Form */}
          <Route path="/form" element={<FormPage />} />
          
          {/* Staff Routes */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Layout sidebarOpen={sidebarOpen} setSidebarOpen={handleSidebarToggle} />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="reception" element={<VehicleReception />} />
            <Route path="reception/edit/:id" element={<VehicleReception />} />
            <Route path="reception/list" element={<VehicleList />} />
            <Route path="completed" element={<CompletedReceptions />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="history" element={<History />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="sms" element={<SMSManagement />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Additional staff routes that need to be accessible */}
          <Route 
            path="/reception" 
            element={isAuthenticated ? <Navigate to="/dashboard/reception" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/reception/list" 
            element={isAuthenticated ? <Navigate to="/dashboard/reception/list" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/completed" 
            element={isAuthenticated ? <Navigate to="/dashboard/completed" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/tasks" 
            element={isAuthenticated ? <Navigate to="/dashboard/tasks" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/history" 
            element={isAuthenticated ? <Navigate to="/dashboard/history" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/users" 
            element={isAuthenticated ? <Navigate to="/dashboard/users" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/customers" 
            element={isAuthenticated ? <Navigate to="/dashboard/customers" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sms" 
            element={isAuthenticated ? <Navigate to="/dashboard/sms" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/messages" 
            element={isAuthenticated ? <Navigate to="/dashboard/messages" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/settings" 
            element={isAuthenticated ? <Navigate to="/dashboard/settings" /> : <Navigate to="/login" />} 
          />
          
          {/* Default redirect to login */}
          <Route path="/" element={<Navigate to="/login" />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;