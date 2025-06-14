import { useState, useEffect, FormEvent } from 'react';
import { ClipboardList, Plus, Eye, Edit, Trash2, Check, History, X, Upload, Image as ImageIcon } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore, Task } from '../../store/taskStore';
import { useReceptionStore } from '../../store/receptionStore';
import { useUserStore } from '../../store/userStore';
import { uploadFile } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const TaskManagement = () => {
  const { user } = useAuthStore();
  const { tasks, loadTasks, addTask, updateTask, deleteTask, addTaskImages, isLoading, error, clearError } = useTaskStore();
  const { getActiveReceptions } = useReceptionStore();
  const { users } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [workReport, setWorkReport] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    title: '',
    description: '',
    assignedTo: '',
    status: 'pending' as const,
    priority: 'medium' as const,
    dueDate: ''
  });

  // Get only active receptions for task creation
  const activeReceptions = getActiveReceptions();

  // Show all users in dropdown, but handle auth_user_id properly
  const availableUsers = users.filter(u => u.active);

  // Filter tasks based on user role and only show tasks for active vehicles
  const filteredTasks = tasks.filter(task => {
    // Check if the vehicle is still active (not completed)
    const isVehicleActive = activeReceptions.some(r => r.id === task.vehicle.id);
    
    if (user?.role === 'admin' || user?.role === 'receptionist') {
      return isVehicleActive; // Show all tasks for active vehicles
    }
    
    // For other users, show tasks assigned to them using user profile ID
    // The task.assignedTo.id contains the user's profile ID from the database
    return task.assignedTo.id === user?.id && isVehicleActive;
  });

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.title || !formData.assignedTo) {
      toast.error('لطفاً تمام فیلدهای ضروری را پر کنید');
      return;
    }

    const vehicle = activeReceptions.find(r => r.id === formData.vehicleId);
    const assignedUser = availableUsers.find(u => u.id === formData.assignedTo);

    if (!vehicle || !assignedUser) {
      toast.error('اطلاعات نامعتبر');
      return;
    }

    // Check if user has auth_user_id for RLS compatibility
    if (!assignedUser.auth_user_id) {
      toast.error('کاربر انتخاب شده هنوز اکانت احراز هویت ندارد. لطفاً ابتدا از بخش مدیریت کاربران، اکانت احراز هویت برای این کاربر ایجاد کنید.');
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        assignedTo: {
          id: assignedUser.id, // Use user profile ID for foreign key constraint
          name: assignedUser.name
        },
        vehicle: {
          id: vehicle.id,
          make: vehicle.vehicleInfo.make,
          model: vehicle.vehicleInfo.model,
          plateNumber: vehicle.vehicleInfo.plateNumber
        },
        dueDate: formData.dueDate
      };

      if (editingTask) {
        const success = await updateTask(editingTask.id, taskData, user?.name || 'کاربر نامشخص');
        if (success) {
          toast.success('وظیفه با موفقیت ویرایش شد');
        } else {
          toast.error('وظیفه یافت نشد - ممکن است توسط کاربر دیگری حذف شده باشد');
          setShowModal(false);
          setEditingTask(null);
          setViewMode(false);
          return;
        }
      } else {
        await addTask(taskData);
        toast.success('وظیفه جدید با موفقیت ایجاد شد');
      }
      
      setShowModal(false);
      setEditingTask(null);
      setViewMode(false);
      setFormData({
        vehicleId: '',
        title: '',
        description: '',
        assignedTo: '',
        status: 'pending',
        priority: 'medium',
        dueDate: ''
      });
    } catch (error) {
      // Error is handled by the store and displayed via toast
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success('وظیفه با موفقیت حذف شد');
    } catch (error) {
      // Error is handled by the store and displayed via toast
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const success = await updateTask(taskId, { status: newStatus }, user?.name || 'کاربر نامشخص');
      if (success) {
        toast.success('وضعیت وظیفه با موفقیت تغییر کرد');
      } else {
        toast.error('وظیفه یافت نشد - ممکن است توسط کاربر دیگری حذف شده باشد');
      }
    } catch (error) {
      // Error is handled by the store and displayed via toast
    }
  };

  const handleCompleteTask = (task: Task) => {
    setCompletingTask(task);
    setWorkReport(task.description || '');
    setSelectedImages([]);
    setShowCompletionModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteSubmit = async () => {
    if (!completingTask) return;

    try {
      setIsUploading(true);

      // Update task with work report
      const success = await updateTask(
        completingTask.id,
        { 
          status: 'completed',
          description: workReport
        },
        user?.name || 'کاربر نامشخص'
      );

      if (!success) {
        toast.error('امکان تکمیل وظیفه وجود ندارد - وظیفه دیگر موجود نیست');
        setShowCompletionModal(false);
        setCompletingTask(null);
        setWorkReport('');
        setSelectedImages([]);
        return;
      }

      // Upload images if any
      if (selectedImages.length > 0) {
        await addTaskImages(completingTask.id, selectedImages, user?.name || 'کاربر نامشخص');
      }

      toast.success('وظیفه با موفقیت تکمیل شد');
      setShowCompletionModal(false);
      setCompletingTask(null);
      setWorkReport('');
      setSelectedImages([]);
    } catch (error) {
      // Error is handled by the store and displayed via toast
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  // Check if user can create tasks
  const canCreateTask = user?.role === 'admin' || 
                       user?.role === 'receptionist' || 
                       user?.permissions?.canCreateTask;

  const canEditTask = (task: Task) => {
    return user?.role === 'admin' || 
           task.assignedTo.id === user?.id || 
           user?.role === 'receptionist';
  };

  // Check if user can complete a task
  const canCompleteTask = (task: Task) => {
    // Admin can complete any task
    if (user?.role === 'admin') {
      return true;
    }
    // Assigned user can complete their own task (compare with user profile ID)
    return task.assignedTo.id === user?.id;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">کارتابل وظایف</h1>
          <p className="text-gray-600 dark:text-gray-400">مدیریت و پیگیری وظایف خودروهای فعال</p>
        </div>
        
        {canCreateTask && (
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditingTask(null);
              setViewMode(false);
              setFormData({
                vehicleId: '',
                title: '',
                description: '',
                assignedTo: '',
                status: 'pending',
                priority: 'medium',
                dueDate: ''
              });
              setShowModal(true);
            }}
            disabled={isLoading}
          >
            ایجاد وظیفه جدید
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">در حال بارگذاری وظایف...</p>
            </div>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              هیچ وظیفه‌ای برای خودروهای فعال یافت نشد
            </div>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id}>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{task.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {task.status === 'pending' ? 'شروع نشده' :
                       task.status === 'in-progress' ? 'در حال انجام' :
                       'انجام شده'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">خودرو:</p>
                      <p>{task.vehicle.make} {task.vehicle.model} - {task.vehicle.plateNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">مسئول انجام:</p>
                      <p>{task.assignedTo.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">تاریخ ایجاد:</p>
                      <p>{task.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">آخرین به‌روزرسانی:</p>
                      <p>{task.updatedAt}</p>
                    </div>
                  </div>

                  {task.description && (
                    <div className="mt-4">
                      <p className="text-gray-600 dark:text-gray-400">گزارش کار:</p>
                      <p className="whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}

                  {/* Task Images */}
                  {task.images && task.images.length > 0 && (
                    <div className="mt-4">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">تصاویر گزارش کار:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {task.images.map((image, index) => (
                          <div key={index} className="relative aspect-video group cursor-pointer">
                            <img
                              src={image}
                              alt={`تصویر ${index + 1}`}
                              className="w-full h-full object-cover rounded border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                              onClick={() => handleImageClick(image)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-row md:flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye size={16} />}
                    onClick={() => {
                      setEditingTask(task);
                      setViewMode(true);
                      // Find the user by profile ID for the form
                      const assignedUser = availableUsers.find(u => u.id === task.assignedTo.id);
                      setFormData({
                        vehicleId: task.vehicle.id,
                        title: task.title,
                        description: task.description,
                        assignedTo: assignedUser?.id || '', // Use user.id for form
                        status: task.status,
                        priority: task.priority,
                        dueDate: task.dueDate
                      });
                      setShowModal(true);
                    }}
                  >
                    مشاهده
                  </Button>
                  
                  {canEditTask(task) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit size={16} />}
                        onClick={() => {
                          setEditingTask(task);
                          setViewMode(false);
                          // Find the user by profile ID for the form
                          const assignedUser = availableUsers.find(u => u.id === task.assignedTo.id);
                          setFormData({
                            vehicleId: task.vehicle.id,
                            title: task.title,
                            description: task.description,
                            assignedTo: assignedUser?.id || '', // Use user.id for form
                            status: task.status,
                            priority: task.priority,
                            dueDate: task.dueDate
                          });
                          setShowModal(true);
                        }}
                      >
                        ویرایش
                      </Button>

                      {task.status !== 'completed' && canCompleteTask(task) && (
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon={<Check size={16} />}
                          onClick={() => handleCompleteTask(task)}
                        >
                          تکمیل
                        </Button>
                      )}

                      {user?.role === 'admin' && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 size={16} />}
                          onClick={() => handleDelete(task.id)}
                        >
                          حذف
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {viewMode ? 'مشاهده وظیفه' : editingTask ? 'ویرایش وظیفه' : 'ایجاد وظیفه جدید'}
                </h2>
                {editingTask && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<History size={16} />}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    تاریخچه تغییرات
                  </Button>
                )}
              </div>
              
              {showHistory && editingTask?.history && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold mb-3">تاریخچه تغییرات:</h3>
                  <div className="space-y-2">
                    {editingTask.history.map((entry, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>{entry.date}</span>
                          <span>توسط: {entry.updatedBy}</span>
                        </div>
                        <p>{entry.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Images in View Mode */}
              {viewMode && editingTask?.images && editingTask.images.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon size={16} />
                    تصاویر گزارش کار ({editingTask.images.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {editingTask.images.map((image: string, index: number) => (
                      <div key={index} className="relative aspect-video group cursor-pointer">
                        <img
                          src={image}
                          alt={`تصویر ${index + 1}`}
                          className="w-full h-full object-cover rounded border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(image)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    خودرو
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="input"
                    required
                    disabled={viewMode || !canCreateTask}
                  >
                    <option value="">انتخاب کنید</option>
                    {activeReceptions.map(reception => (
                      <option key={reception.id} value={reception.id}>
                        {reception.vehicleInfo.make} {reception.vehicleInfo.model} - {reception.vehicleInfo.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    عنوان وظیفه
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    required
                    disabled={viewMode || !canCreateTask}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    مسئول انجام
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="input"
                    required
                    disabled={viewMode || !canCreateTask}
                  >
                    <option value="">انتخاب کنید</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'admin' ? 'مدیر' :
                                 u.role === 'technician' ? 'تکنسین' :
                                 u.role === 'receptionist' ? 'پذیرش' :
                                 u.role === 'warehouse' ? 'انباردار' :
                                 u.role === 'detailing' ? 'دیتیلینگ' :
                                 u.role === 'accountant' ? 'حسابدار' : u.role})
                        {!u.auth_user_id && ' (بدون اکانت احراز هویت)'}
                      </option>
                    ))}
                  </select>
                  {formData.assignedTo && !availableUsers.find(u => u.id === formData.assignedTo)?.auth_user_id && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ این کاربر هنوز اکانت احراز هویت ندارد. برای ایجاد وظیفه، ابتدا از بخش مدیریت کاربران اکانت احراز هویت ایجاد کنید.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      اولویت
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="input"
                      disabled={viewMode && !canEditTask(editingTask!)}
                    >
                      <option value="low">پایین</option>
                      <option value="medium">متوسط</option>
                      <option value="high">بالا</option>
                    </select>
                  </div>

                  {(canCreateTask || formData.assignedTo === user?.id) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        وضعیت
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="input"
                        disabled={viewMode && !canEditTask(editingTask!)}
                      >
                        <option value="pending">شروع نشده</option>
                        <option value="in-progress">در حال انجام</option>
                        <option value="completed">انجام شده</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    گزارش کار
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={4}
                    disabled={viewMode && !canEditTask(editingTask!)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTask(null);
                      setViewMode(false);
                    }}
                  >
                    بستن
                  </Button>
                  {(!viewMode || canEditTask(editingTask!)) && (
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isLoading}
                    >
                      {editingTask ? 'به‌روزرسانی' : 'ایجاد وظیفه'}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {showCompletionModal && completingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCompletionModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">تکمیل وظیفه</h2>
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">اطلاعات وظیفه:</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">عنوان:</span> {completingTask.title}</p>
                    <p><span className="font-medium">خودرو:</span> {completingTask.vehicle.make} {completingTask.vehicle.model} - {completingTask.vehicle.plateNumber}</p>
                    <p><span className="font-medium">مسئول:</span> {completingTask.assignedTo.name}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    گزارش کار
                  </label>
                  <textarea
                    value={workReport}
                    onChange={(e) => setWorkReport(e.target.value)}
                    className="input"
                    rows={6}
                    placeholder="گزارش کار انجام شده را وارد کنید..."
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    بارگذاری تصویر
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="task-images"
                    />
                    <label
                      htmlFor="task-images"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        برای آپلود تصاویر کلیک کنید
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        فرمت‌های مجاز: JPG, PNG, GIF
                      </span>
                    </label>
                  </div>

                  {/* Selected Images Preview */}
                  {selectedImages.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        تصاویر انتخاب شده ({selectedImages.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`تصویر ${index + 1}`}
                              className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {file.name.length > 10 ? file.name.substring(0, 10) + '...' : file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionModal(false)}
                >
                  انصراف
                </Button>
                <Button
                  variant="success"
                  onClick={handleCompleteSubmit}
                  leftIcon={<Check size={16} />}
                  isLoading={isUploading}
                >
                  تکمیل وظیفه
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setShowImageModal(false)}></div>
            
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg z-10"
              >
                <X size={20} />
              </button>
              
              <img
                src={selectedImageUrl}
                alt="تصویر بزرگ"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;