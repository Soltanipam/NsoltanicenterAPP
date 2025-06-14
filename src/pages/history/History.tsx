import { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  ClipboardList, 
  Car, 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  User,
  CheckCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { useReceptionStore } from '../../store/receptionStore';
import { useUserStore } from '../../store/userStore';
import { formatLicensePlate, formatCurrency, englishToPersian } from '../../utils/numberUtils';
import moment from 'moment-jalaali';

const History = () => {
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();
  const { getCompletedReceptions } = useReceptionStore();
  const { users } = useUserStore();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'vehicles'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Check if user has permission to view history
  const canViewHistory = user?.role === 'admin' || (user?.permissions?.canViewHistory ?? false);

  // If user doesn't have permission, show access denied
  if (!canViewHistory) {
    return (
      <div className="animate-fade-in">
        <Card>
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              دسترسی محدود
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              شما دسترسی لازم برای مشاهده تاریخچه را ندارید
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              برای دریافت دسترسی با مدیر سیستم تماس بگیرید
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Get completed tasks
  const completedTasks = tasks.filter(task => task.status === 'completed');
  
  // Get completed vehicles
  const completedVehicles = getCompletedReceptions();

  // Filter completed tasks
  const filteredTasks = completedTasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vehicle.plateNumber.includes(searchQuery) ||
      task.assignedTo.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = !dateFilter || task.updatedAt.includes(dateFilter);
    const matchesUser = !userFilter || task.assignedTo.id === userFilter;
    
    return matchesSearch && matchesDate && matchesUser;
  });

  // Filter completed vehicles
  const filteredVehicles = completedVehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.customerInfo.phone.includes(searchQuery) ||
      vehicle.vehicleInfo.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicleInfo.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicleInfo.plateNumber.includes(searchQuery) ||
      (vehicle.completedBy && vehicle.completedBy.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDate = !dateFilter || (vehicle.completedAt && vehicle.completedAt.includes(dateFilter));
    
    return matchesSearch && matchesDate;
  });

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('');
    setUserFilter('');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-purple-600" />
            تاریخچه
          </h1>
          <p className="text-gray-600 dark:text-gray-400">مشاهده تاریخچه کامل وظایف و خودروهای تکمیل شده</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-reverse space-x-8">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                وظایف تکمیل شده
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                  {englishToPersian(filteredTasks.length.toString())}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicles'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Car size={16} />
                خودروهای تحویل شده
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                  {englishToPersian(filteredVehicles.length.toString())}
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="فیلتر بر اساس تاریخ (مثال: ۱۴۰۳/۰۱)"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700"
            />
          </div>

          {activeTab === 'tasks' && (
            <div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700"
              >
                <option value="">همه کاربران</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              پاک کردن فیلترها
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {activeTab === 'tasks' ? (
        /* Completed Tasks */
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">هیچ وظیفه تکمیل شده‌ای یافت نشد</h3>
                <p>با تغییر فیلترها جستجو کنید</p>
              </div>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const isExpanded = expandedItems.has(task.id);
              
              return (
                <Card key={task.id}>
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleItemExpansion(task.id)}
                  >
                    <div className="flex items-center gap-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-bold text-lg">{task.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Car size={14} />
                            {task.vehicle.make} {task.vehicle.model} - {formatLicensePlate(task.vehicle.plateNumber)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {task.assignedTo.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {task.updatedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t dark:border-gray-700 space-y-4">
                      {/* Task Description */}
                      {task.description && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText size={16} />
                            گزارش کار
                          </h4>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <p className="whitespace-pre-wrap">{task.description}</p>
                          </div>
                        </div>
                      )}

                      {/* Task Images */}
                      {task.images && task.images.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ImageIcon size={16} />
                            تصاویر گزارش کار ({englishToPersian(task.images.length.toString())})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {task.images.map((image: string, index: number) => (
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

                      {/* Task History */}
                      {task.history && task.history.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Clock size={16} />
                            تاریخچه تغییرات
                          </h4>
                          <div className="space-y-2">
                            {task.history.map((entry: any, index: number) => (
                              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm">{entry.description}</p>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                                    <div>{entry.date}</div>
                                    <div>توسط: {entry.updatedBy}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Completed Vehicles */
        <div className="space-y-4">
          {filteredVehicles.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Car className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">هیچ خودرو تحویل شده‌ای یافت نشد</h3>
                <p>با تغییر فیلترها جستجو کنید</p>
              </div>
            </Card>
          ) : (
            filteredVehicles.map((vehicle) => {
              const isExpanded = expandedItems.has(vehicle.id);
              
              return (
                <Card key={vehicle.id} className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleItemExpansion(vehicle.id)}
                  >
                    <div className="flex items-center gap-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-bold text-lg">
                          {vehicle.vehicleInfo.make} {vehicle.vehicleInfo.model}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {vehicle.customerInfo.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car size={14} />
                            {formatLicensePlate(vehicle.vehicleInfo.plateNumber)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            تحویل: {vehicle.completedAt}
                          </span>
                          {vehicle.completedBy && (
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              توسط: {vehicle.completedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t dark:border-gray-700 space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <User size={16} />
                          اطلاعات مشتری
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">نام مشتری</p>
                            <p className="font-medium">{vehicle.customerInfo.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">شماره تماس</p>
                            <p className="font-medium ltr">{vehicle.customerInfo.phone}</p>
                          </div>
                          {vehicle.customerInfo.address && (
                            <div className="col-span-2">
                              <p className="text-gray-600 dark:text-gray-400 text-sm">آدرس</p>
                              <p className="font-medium">{vehicle.customerInfo.address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Car size={16} />
                          مشخصات خودرو
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <p className="text-gray-600 dark:text-gray-400 text-sm">کیلومتر</p>
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
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">تاریخ تحویل</p>
                            <p className="font-medium text-green-600 dark:text-green-400">{vehicle.completedAt}</p>
                          </div>
                        </div>
                      </div>

                      {/* Service Description */}
                      {vehicle.serviceInfo.description && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            شرح خدمات انجام شده
                          </h4>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <p className="whitespace-pre-wrap">{vehicle.serviceInfo.description}</p>
                          </div>
                        </div>
                      )}

                      {/* Customer Requests */}
                      {vehicle.serviceInfo.customerRequests && vehicle.serviceInfo.customerRequests.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            درخواست‌های مشتری
                          </h4>
                          <div className="space-y-2">
                            {vehicle.serviceInfo.customerRequests.map((request: string, index: number) => (
                              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <p>{request}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vehicle Images */}
                      {vehicle.images && vehicle.images.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ImageIcon size={16} />
                            تصاویر خودرو ({englishToPersian(vehicle.images.length.toString())})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {vehicle.images.map((image: string, index: number) => (
                              <div key={index} className="relative aspect-video group cursor-pointer">
                                <img
                                  src={image}
                                  alt={`تصویر خودرو ${index + 1}`}
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

                      {/* Billing Information */}
                      {vehicle.billing && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            اطلاعات فاکتور
                          </h4>
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Services */}
                              {vehicle.billing.services.length > 0 && (
                                <div>
                                  <h5 className="font-medium mb-2">خدمات انجام شده:</h5>
                                  <div className="space-y-1">
                                    {vehicle.billing.services.map((service: any, index: number) => (
                                      <div key={index} className="flex justify-between text-sm">
                                        <span>{service.name}</span>
                                        <span className="font-mono">{formatCurrency(service.price * service.quantity)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Parts */}
                              {vehicle.billing.parts.length > 0 && (
                                <div>
                                  <h5 className="font-medium mb-2">قطعات مصرفی:</h5>
                                  <div className="space-y-1">
                                    {vehicle.billing.parts.map((part: any, index: number) => (
                                      <div key={index} className="flex justify-between text-sm">
                                        <span>{part.name}</span>
                                        <span className="font-mono">{formatCurrency(part.price * part.quantity)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                              <div className="flex justify-between items-center font-bold text-lg">
                                <span>مجموع کل:</span>
                                <span className="font-mono text-green-600 dark:text-green-400">
                                  {formatCurrency(vehicle.billing.total)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
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

export default History;