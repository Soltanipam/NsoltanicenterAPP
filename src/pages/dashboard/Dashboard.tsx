import { useEffect, useState } from 'react';
import { ClipboardList, CarFront, Users, CheckCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useReceptionStore } from '../../store/receptionStore';
import { useTaskStore } from '../../store/taskStore';
import { toast } from 'react-hot-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-r-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={`p-2 rounded-full ${color.replace('border-r-4 ', '').replace('border', 'bg')}/10`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getActiveReceptions } = useReceptionStore();
  const { tasks } = useTaskStore();
  const [showNotification, setShowNotification] = useState(false);
  
  // Get only active receptions (not completed)
  const activeReceptions = getActiveReceptions();
  
  // Filter tasks for current user
  const userTasks = tasks.filter(task => task.assignedTo.id === user?.id);
  const activeVehicles = activeReceptions.length;
  const tasksInProgress = userTasks.filter(t => t.status === 'in-progress').length;
  const completedToday = userTasks.filter(t => {
    const today = new Date().toLocaleDateString('fa-IR');
    return t.status === 'completed' && t.updatedAt === today;
  }).length;

  const totalCustomers = new Set(activeReceptions.map(r => r.customerInfo.phone)).size;
  const totalVehicles = activeReceptions.length;

  // Check for new tasks
  useEffect(() => {
    const newTasks = tasks.filter(task => 
      task.assignedTo.id === user?.id && 
      task.createdAt === new Date().toLocaleDateString('fa-IR')
    );

    if (newTasks.length > 0) {
      setShowNotification(true);
      toast.success(`${newTasks.length} وظیفه جدید به شما محول شد`);
    }
  }, [tasks, user?.id]);

  const handleTaskClick = (taskId: string) => {
    navigate('/tasks', { state: { selectedTaskId: taskId } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('fa-IR')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="خودروهای در تعمیرگاه" 
          value={activeVehicles} 
          icon={<CarFront className="text-blue-600\" size={24} />} 
          color="border-blue-500" 
        />
        <StatCard 
          title="وظایف در حال انجام" 
          value={tasksInProgress} 
          icon={<ClipboardList className="text-yellow-600\" size={24} />} 
          color="border-yellow-500" 
        />
        <StatCard 
          title="تکمیل شده امروز" 
          value={completedToday} 
          icon={<CheckCircle className="text-green-600\" size={24} />} 
          color="border-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title={`وظایف جاری ${user?.name || ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-right py-3 px-2">عنوان</th>
                  <th className="text-right py-3 px-2">وضعیت</th>
                  <th className="text-right py-3 px-2">خودرو</th>
                  <th className="text-right py-3 px-2">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <td className="py-3 px-2">{task.title}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {task.status === 'pending' ? 'در انتظار' :
                         task.status === 'in-progress' ? 'در حال انجام' :
                         'تکمیل شده'}
                      </span>
                    </td>
                    <td className="py-3 px-2">{`${task.vehicle.make} ${task.vehicle.model} - ${task.vehicle.plateNumber}`}</td>
                    <td className="py-3 px-2 ltr text-left">{task.date}</td>
                  </tr>
                ))}
                {userTasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      هیچ وظیفه‌ای یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="آمار کلی">
          {(user?.role === 'admin' || user?.role === 'receptionist') ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-500" />
                  <span>تعداد مشتریان</span>
                </div>
                <span className="font-bold">{totalCustomers} نفر</span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <CarFront size={18} className="text-gray-500" />
                  <span>خودروهای فعال</span>
                </div>
                <span className="font-bold">{totalVehicles} خودرو</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-gray-500" />
                  <span>وظایف محول شده</span>
                </div>
                <span className="font-bold">{userTasks.length} وظیفه</span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-gray-500" />
                  <span>وظایف تکمیل شده</span>
                </div>
                <span className="font-bold">
                  {userTasks.filter(t => t.status === 'completed').length} وظیفه
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showNotification && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 animate-slide-in">
          <div className="flex items-center gap-2">
            <Bell className="text-accent" size={20} />
            <span>وظایف جدید به شما محول شده است</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;