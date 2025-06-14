import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  Clock, 
  FileText, 
  LogOut, 
  Calendar,
  User,
  Settings,
  CheckCircle,
  AlertCircle,
  Wrench,
  Eye,
  X,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCustomerAuthStore } from '../../store/customerAuthStore';
import { useTaskStore } from '../../store/taskStore';
import { useReceptionStore } from '../../store/receptionStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import { formatLicensePlate, englishToPersian } from '../../utils/numberUtils';
import { toast } from 'react-hot-toast';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuthStore();
  const { tasks, loadTasks } = useTaskStore();
  const { receptions, getActiveReceptions } = useReceptionStore();
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
      return;
    }

    // Load tasks when component mounts
    loadTasks();
  }, [customer, navigate, loadTasks]);

  const handleLogout = () => {
    logout();
    toast.success('با موفقیت خارج شدید');
    navigate('/customer-login');
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const toggleVehicleExpansion = (vehicleId: string) => {
    setExpandedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  if (!customer) {
    return null;
  }

  // Get customer's vehicles (active receptions)
  const customerVehicles = getActiveReceptions().filter(r => 
    r.customerInfo.phone === customer.phone
  );

  // Get customer's tasks
  const customerTasks = tasks.filter(task => 
    customerVehicles.some(vehicle => vehicle.id === task.vehicle.id)
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'در انتظار شروع تعمیرات';
      case 'in-progress':
        return 'در حال تعمیر';
      case 'completed':
        return 'تعمیرات تکمیل شده';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in-progress':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'در انتظار';
      case 'in-progress':
        return 'در حال انجام';
      case 'completed':
        return 'انجام شده';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold">پورتال مشتریان سلطانی سنتر</h1>
                <p className="text-sm text-gray-200">پیگیری وضعیت تعمیر خودرو</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                <p className="text-sm text-gray-200">شناسه: {englishToPersian(customer.customerId)}</p>
              </div>
              
              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={16} />}
              >
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Customer Information */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">اطلاعات شخصی</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">نام و نام خانوادگی</p>
              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">شماره تماس</p>
              <p className="font-medium ltr">{customer.phone}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">شناسه مشتری</p>
              <p className="font-medium">{englishToPersian(customer.customerId)}</p>
            </div>
          </div>
        </Card>

        {/* Customer Vehicles */}
        {customerVehicles.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Car className="w-7 h-7 text-green-600" />
              خودروهای شما در تعمیرگاه
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                ({englishToPersian(customerVehicles.length.toString())} خودرو)
              </span>
            </h2>
            
            {customerVehicles.map((vehicle) => {
              const isExpanded = expandedVehicles.has(vehicle.id);
              const vehicleTasks = customerTasks.filter(task => task.vehicle.id === vehicle.id);
              
              return (
                <Card key={vehicle.id}>
                  {/* Vehicle Header */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleVehicleExpansion(vehicle.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {vehicle.vehicleInfo.make} {vehicle.vehicleInfo.model}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          پلاک: {formatLicensePlate(vehicle.vehicleInfo.plateNumber)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(vehicle.status)}`}>
                        {getStatusText(vehicle.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t dark:border-gray-700 space-y-6">
                      {/* Vehicle Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Car className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold">مشخصات خودرو</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">برند</p>
                            <p className="font-medium">{vehicle.vehicleInfo.make}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">مدل</p>
                            <p className="font-medium">{vehicle.vehicleInfo.model}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">سال تولید</p>
                            <p className="font-medium">{englishToPersian(vehicle.vehicleInfo.year)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">رنگ</p>
                            <p className="font-medium">{vehicle.vehicleInfo.color}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">کیلومتر کارکرد</p>
                            <p className="font-medium">{englishToPersian(vehicle.vehicleInfo.mileage)} کیلومتر</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">شماره شاسی</p>
                            <p className="font-medium font-mono text-sm">{vehicle.vehicleInfo.vin}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">تاریخ پذیرش</p>
                            <p className="font-medium">{vehicle.createdAt}</p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Requests */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <h4 className="font-semibold">درخواست‌های شما</h4>
                        </div>
                        <div className="space-y-2">
                          {vehicle.serviceInfo.customerRequests?.map((request: string, index: number) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p>{request}</p>
                            </div>
                          ))}
                          {(!vehicle.serviceInfo.customerRequests || vehicle.serviceInfo.customerRequests.length === 0) && (
                            <p className="text-gray-500 dark:text-gray-400">درخواست خاصی ثبت نشده است</p>
                          )}
                        </div>
                      </div>

                      {/* Service Description */}
                      {vehicle.serviceInfo.description && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            <h4 className="font-semibold">شرح خدمات انجام شده</h4>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <p className="whitespace-pre-wrap">{vehicle.serviceInfo.description}</p>
                          </div>
                        </div>
                      )}

                      {/* Vehicle Images */}
                      {vehicle.images && vehicle.images.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold">تصاویر خودرو</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {vehicle.images.map((image: string, index: number) => (
                              <div key={index} className="relative aspect-video group">
                                <img
                                  src={image}
                                  alt={`تصویر خودرو ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => handleImageClick(image)}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tasks Progress */}
                      {vehicleTasks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Wrench className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold">مراحل تعمیر</h4>
                          </div>
                          <div className="space-y-3">
                            {vehicleTasks.map((task) => (
                              <div key={task.id} className="border dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium">{task.title}</h5>
                                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                                    {getTaskStatusText(task.status)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600 dark:text-gray-400">مسئول انجام:</p>
                                    <p>{task.assignedTo.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 dark:text-gray-400">آخرین به‌روزرسانی:</p>
                                    <p>{task.updatedAt}</p>
                                  </div>
                                </div>
                                
                                {task.description && (
                                  <div className="mt-3 pt-3 border-t dark:border-gray-700">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">گزارش کار:</p>
                                    <p className="text-sm">{task.description}</p>
                                  </div>
                                )}

                                {/* Task Images */}
                                {task.images && task.images.length > 0 && (
                                  <div className="mt-3 pt-3 border-t dark:border-gray-700">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">تصاویر گزارش کار:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {task.images.map((image: string, imageIndex: number) => (
                                        <div key={imageIndex} className="relative aspect-video group cursor-pointer">
                                          <img
                                            src={image}
                                            alt={`تصویر کار ${imageIndex + 1}`}
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
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          /* No Vehicles */
          <Card>
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                خودرویی در تعمیرگاه نیست
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                در حال حاضر خودرویی از شما در تعمیرگاه نیست
              </p>
            </div>
          </Card>
        )}
      </div>

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

export default CustomerDashboard;