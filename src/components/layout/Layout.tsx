import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/authStore';

interface LayoutProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Layout = ({ sidebarOpen, setSidebarOpen }: LayoutProps) => {
  const { user } = useAuthStore();

  return (
    <div className="h-screen flex flex-col">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        <main className={`flex-1 overflow-auto p-4 md:p-6 transition-all duration-300 ${sidebarOpen ? 'mr-64' : 'mr-16'}`}>
          {user?.jobDescription && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold mb-1 text-blue-800 dark:text-blue-300">شرح وظایف شما:</h3>
              <p className="text-blue-700 dark:text-blue-400">{user.jobDescription}</p>
            </div>
          )}
          
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      </div>
    </div>
  );
};

export default Layout;