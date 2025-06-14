import { useState } from 'react';
import { Search, Edit, Eye, Printer, Trash2, Check, X, Calculator } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useReceptionStore } from '../../store/receptionStore';
import { useTaskStore } from '../../store/taskStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { formatLicensePlate, formatNumber, parseFormattedNumber, formatCurrency, englishToPersian, formatQuantity } from '../../utils/numberUtils';
import { createPersianPDF, addPersianText, addEnglishText } from '../../utils/pdfUtils';
import moment from 'moment-jalaali';

const VehicleList = () => {
  const navigate = useNavigate();
  const { getActiveReceptions, deleteReception, updateReception, completeReception } = useReceptionStore();
  const { tasks, completeVehicleTasks } = useTaskStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [billingData, setBillingData] = useState({
    services: [] as { name: string; price: number; quantity: number }[],
    parts: [] as { name: string; price: number; quantity: number }[],
    discount: 0,
    tax: 0
  });

  // Get only active receptions (not completed)
  const receptions = getActiveReceptions();

  // Check permissions
  const canDeleteReceptions = user?.role === 'admin';
  const canCompleteServices = user?.role === 'admin' || user?.permissions?.canCompleteServices;

  const filteredVehicles = receptions.filter(reception => {
    const matchesSearch = 
      reception.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reception.customerInfo.phone.includes(searchQuery) ||
      reception.vehicleInfo.plateNumber.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || reception.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (reception: any) => {
    setSelectedReception(reception);
    setShowDetailsModal(true);
  };

  const handleCompleteServices = (reception: any) => {
    if (!canCompleteServices) {
      toast.error('شما دسترسی تکمیل خدمات را ندارید');
      return;
    }

    setSelectedReception(reception);
    setBillingData({
      services: [{ name: '', price: 0, quantity: 1 }],
      parts: [{ name: '', price: 0, quantity: 1 }],
      discount: 0,
      tax: 9
    });
    setShowBillingModal(true);
  };

  const handleEdit = (id: string) => {
    navigate(`/reception/edit/${id}`);
  };

  const handlePrint = async (reception: any) => {
    try {
      const doc = createPersianPDF();
      let currentY = 20;

      // Header with company info
      addPersianText(doc, 'فرم پذیرش خودرو', doc.internal.pageSize.width / 2, currentY, {
        align: 'center',
        fontSize: 16,
        fontStyle: 'bold'
      });
      currentY += 10;

      addPersianText(doc, 'سلطانی سنتر', doc.internal.pageSize.width / 2, currentY, {
        align: 'center',
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 8;

      addPersianText(doc, 'برترین‌ها برای بهترین‌ها', doc.internal.pageSize.width / 2, currentY, {
        align: 'center',
        fontSize: 10
      });
      currentY += 15;

      // Add separator line
      doc.setLineWidth(0.5);
      doc.line(20, currentY, doc.internal.pageSize.width - 20, currentY);
      currentY += 15;

      // Customer Information Section
      addPersianText(doc, 'اطلاعات مشتری:', 20, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 10;

      const customerData = [
        ['نام و نام خانوادگی', reception.customerInfo.name || '-'],
        ['شماره تماس', reception.customerInfo.phone || '-'],
        ['کد ملی', reception.customerInfo.nationalId || '-'],
        ['آدرس', reception.customerInfo.address || '-']
      ];

      customerData.forEach(([label, value]) => {
        addPersianText(doc, `${label}:`, 25, currentY, { fontSize: 10 });
        addPersianText(doc, value, 80, currentY, { fontSize: 10 });
        currentY += 6;
      });

      currentY += 10;

      // Vehicle Information Section
      addPersianText(doc, 'اطلاعات خودرو:', 20, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 10;

      const vehicleData = [
        ['سازنده', reception.vehicleInfo.make || '-'],
        ['مدل', reception.vehicleInfo.model || '-'],
        ['سال تولید', reception.vehicleInfo.year || '-'],
        ['رنگ', reception.vehicleInfo.color || '-'],
        ['شماره پلاک', formatLicensePlate(reception.vehicleInfo.plateNumber) || '-'],
        ['شماره شاسی', reception.vehicleInfo.vin || '-'],
        ['کیلومتر', reception.vehicleInfo.mileage || '-']
      ];

      vehicleData.forEach(([label, value]) => {
        addPersianText(doc, `${label}:`, 25, currentY, { fontSize: 10 });
        // Use English text for numbers and technical data
        if (label === 'شماره شاسی' || label === 'کیلومتر' || label === 'سال تولید') {
          addEnglishText(doc, value, 80, currentY, { fontSize: 10, align: 'left' });
        } else {
          addPersianText(doc, value, 80, currentY, { fontSize: 10 });
        }
        currentY += 6;
      });

      currentY += 10;

      // Service Information Section
      addPersianText(doc, 'اطلاعات سرویس:', 20, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 10;

      addPersianText(doc, 'شرح خدمات:', 25, currentY, { fontSize: 10 });
      currentY += 6;

      // Service description with text wrapping
      const serviceDescription = reception.serviceInfo.description || 'توضیحی ثبت نشده';
      const descriptionHeight = addPersianText(doc, serviceDescription, 30, currentY, {
        fontSize: 10,
        maxWidth: doc.internal.pageSize.width - 60
      });
      currentY += descriptionHeight + 10;

      // Customer Requests Section
      if (reception.serviceInfo.customerRequests && reception.serviceInfo.customerRequests.length > 0) {
        addPersianText(doc, 'درخواست‌های مشتری:', 20, currentY, {
          fontSize: 12,
          fontStyle: 'bold'
        });
        currentY += 10;
        
        reception.serviceInfo.customerRequests.forEach((request: string, index: number) => {
          const requestText = `${englishToPersian((index + 1).toString())}. ${request}`;
          const requestHeight = addPersianText(doc, requestText, 25, currentY, {
            fontSize: 10,
            maxWidth: doc.internal.pageSize.width - 50
          });
          currentY += requestHeight + 3;
        });
      }

      currentY += 15;

      // Signature Section
      addPersianText(doc, 'امضای مشتری:', 20, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 10;

      // Create signature box
      const signatureBoxWidth = 80;
      const signatureBoxHeight = 30;
      doc.setLineWidth(0.5);
      doc.rect(20, currentY, signatureBoxWidth, signatureBoxHeight);

      // Add signature if available
      if (reception.serviceInfo.signature) {
        try {
          doc.addImage(
            reception.serviceInfo.signature, 
            'PNG', 
            22, 
            currentY + 2, 
            signatureBoxWidth - 4, 
            signatureBoxHeight - 4
          );
        } catch (error) {
          console.warn('Could not add signature image:', error);
          addPersianText(doc, 'امضای دیجیتال موجود', 25, currentY + 18, {
            fontSize: 8
          });
        }
      } else {
        addPersianText(doc, 'محل امضای مشتری', 25, currentY + 18, {
          fontSize: 8
        });
      }

      currentY += signatureBoxHeight + 15;

      // Date and time information
      addPersianText(doc, `تاریخ چاپ: ${moment().format('jYYYY/jMM/jDD')}`, 20, currentY, {
        fontSize: 9
      });
      addEnglishText(doc, `${moment().format('HH:mm')} :ساعت چاپ`, 20, currentY + 6, {
        fontSize: 9
      });
      addPersianText(doc, `تاریخ پذیرش: ${reception.createdAt}`, 120, currentY, {
        fontSize: 9
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addPersianText(doc, 
          `صفحه ${englishToPersian(i.toString())} از ${englishToPersian(pageCount.toString())}`, 
          doc.internal.pageSize.width / 2, 
          doc.internal.pageSize.height - 10, 
          { align: 'center', fontSize: 8 }
        );
      }

      // Add images on separate pages if available
      if (reception.images?.length > 0) {
        doc.addPage();
        addPersianText(doc, 'تصاویر خودرو', 20, 20, {
          fontSize: 14,
          fontStyle: 'bold'
        });

        let y = 35;
        reception.images.forEach((image: string, index: number) => {
          if (y > 200) {
            doc.addPage();
            y = 20;
          }
          try {
            doc.addImage(image, 'JPEG', 20, y, 170, 100);
            addPersianText(doc, `تصویر ${englishToPersian((index + 1).toString())}`, 20, y + 105, {
              fontSize: 10
            });
            y += 120;
          } catch (error) {
            console.warn('Could not add image to PDF:', error);
            addPersianText(doc, `خطا در بارگذاری تصویر ${englishToPersian((index + 1).toString())}`, 20, y, {
              fontSize: 10
            });
            y += 15;
          }
        });
      }

      // Save the PDF with Persian filename
      const customerName = reception.customerInfo.name.replace(/\s+/g, '-');
      const fileName = `پذیرش-${customerName}-${moment().format('jYYYY-jMM-jDD')}.pdf`;
      doc.save(fileName);
      toast.success('فایل PDF با موفقیت ایجاد شد');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('خطا در ایجاد فایل PDF');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteReceptions) {
      toast.error('شما دسترسی حذف پذیرش را ندارید');
      return;
    }

    setIsDeleting(id);
    try {
      await deleteReception(id);
      toast.success('پذیرش با موفقیت حذف شد');
    } catch (error) {
      toast.error('خطا در حذف پذیرش');
    } finally {
      setIsDeleting(null);
    }
  };

  const addServiceItem = () => {
    setBillingData(prev => ({
      ...prev,
      services: [...prev.services, { name: '', price: 0, quantity: 1 }]
    }));
  };

  const addPartItem = () => {
    setBillingData(prev => ({
      ...prev,
      parts: [...prev.parts, { name: '', price: 0, quantity: 1 }]
    }));
  };

  const updateServiceItem = (index: number, field: string, value: any) => {
    setBillingData(prev => ({
      ...prev,
      services: prev.services.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updatePartItem = (index: number, field: string, value: any) => {
    setBillingData(prev => ({
      ...prev,
      parts: prev.parts.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeServiceItem = (index: number) => {
    setBillingData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const removePartItem = (index: number) => {
    setBillingData(prev => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const servicesTotal = billingData.services.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const partsTotal = billingData.parts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotal = servicesTotal + partsTotal;
    const discountAmount = (subtotal * billingData.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * billingData.tax) / 100;
    return taxableAmount + taxAmount;
  };

  const handleFinalizeBilling = async () => {
    try {
      const billing = {
        services: billingData.services.filter(s => s.name && s.price > 0),
        parts: billingData.parts.filter(p => p.name && p.price > 0),
        discount: billingData.discount,
        tax: billingData.tax,
        total: calculateTotal()
      };

      // Complete reception with billing data
      await completeReception(selectedReception.id, billing, user?.name || 'کاربر نامشخص');
      
      // Complete all tasks related to this vehicle
      completeVehicleTasks(selectedReception.id);
      
      toast.success('خدمات با موفقیت تکمیل شد و خودرو از لیست فعال حذف شد');
      setShowBillingModal(false);
      setSelectedReception(null);
    } catch (error) {
      toast.error('خطا در تکمیل خدمات');
    }
  };

  // Get tasks for selected vehicle
  const getVehicleTasks = (vehicleId: string) => {
    return tasks.filter(task => task.vehicle.id === vehicleId);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">لیست پذیرش خودرو</h1>
          <p className="text-gray-600 dark:text-gray-400">مدیریت و پیگیری خودروهای فعال در تعمیرگاه</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
              placeholder="جستجو در پذیرش‌ها..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input min-w-[180px]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="in-progress">در حال تعمیر</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-500 dark:text-gray-400">هیچ خودرو فعالی در تعمیرگاه یافت نشد</p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="font-bold text-lg">
                      {vehicle.vehicleInfo.make} {vehicle.vehicleInfo.model}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      vehicle.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      vehicle.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {vehicle.status === 'pending' ? 'در انتظار' :
                       vehicle.status === 'in-progress' ? 'در حال تعمیر' :
                       'تکمیل شده'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">مشتری:</p>
                      <p>{vehicle.customerInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">شماره تماس:</p>
                      <p className="ltr">{vehicle.customerInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">پلاک:</p>
                      <p>{formatLicensePlate(vehicle.vehicleInfo.plateNumber)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">تاریخ پذیرش:</p>
                      <p>{vehicle.createdAt}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye size={16} />}
                    onClick={() => handleViewDetails(vehicle)}
                  >
                    مشاهده
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit size={16} />}
                    onClick={() => handleEdit(vehicle.id)}
                  >
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer size={16} />}
                    onClick={() => handlePrint(vehicle)}
                  >
                    چاپ
                  </Button>
                  {canCompleteServices && (
                    <Button
                      variant="success"
                      size="sm"
                      leftIcon={<Calculator size={16} />}
                      onClick={() => handleCompleteServices(vehicle)}
                    >
                      تکمیل خدمات
                    </Button>
                  )}
                  {canDeleteReceptions && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      isLoading={isDeleting === vehicle.id}
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      حذف
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showDetailsModal && selectedReception && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDetailsModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
              <h2 className="text-xl font-bold mb-6">جزئیات پذیرش</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">اطلاعات مشتری</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">نام:</p>
                      <p>{selectedReception.customerInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">تلفن:</p>
                      <p className="ltr">{selectedReception.customerInfo.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400">آدرس:</p>
                      <p>{selectedReception.customerInfo.address}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">اطلاعات خودرو</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">مدل:</p>
                      <p>{selectedReception.vehicleInfo.make} {selectedReception.vehicleInfo.model}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">سال:</p>
                      <p>{selectedReception.vehicleInfo.year}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">رنگ:</p>
                      <p>{selectedReception.vehicleInfo.color}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">پلاک:</p>
                      <p>{formatLicensePlate(selectedReception.vehicleInfo.plateNumber)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">شرح خدمات</h3>
                  <p>{selectedReception.serviceInfo.description}</p>
                  
                  <h4 className="font-semibold mt-4 mb-2">درخواست مشتری:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(selectedReception.serviceInfo.customerRequests || []).map((request: string, index: number) => (
                      <li key={index}>{request}</li>
                    ))}
                  </ul>
                </div>

                {selectedReception.images?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">تصاویر خودرو</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedReception.images.map((image: string, index: number) => (
                        <div key={index} className="relative aspect-video">
                          <img
                            src={image}
                            alt={`تصویر ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button
                  variant="primary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  بستن
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBillingModal && selectedReception && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowBillingModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">تکمیل خدمات و صدور فاکتور</h2>
                <button
                  onClick={() => setShowBillingModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reception and Tasks Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">اطلاعات پذیرش</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                      <p><span className="font-medium">خودرو:</span> {selectedReception.vehicleInfo.make} {selectedReception.vehicleInfo.model}</p>
                      <p><span className="font-medium">مشتری:</span> {selectedReception.customerInfo.name}</p>
                      <p><span className="font-medium">پلاک:</span> {formatLicensePlate(selectedReception.vehicleInfo.plateNumber)}</p>
                      <p><span className="font-medium">درخواست مشتری:</span> {selectedReception.serviceInfo.customerRequests?.[0]}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">کارهای انجام شده</h3>
                    <div className="space-y-2">
                      {getVehicleTasks(selectedReception.id).map((task) => (
                        <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                              <p className="text-sm">مسئول: {task.assignedTo.name}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {task.status === 'completed' ? 'انجام شده' :
                               task.status === 'in-progress' ? 'در حال انجام' :
                               'در انتظار'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {getVehicleTasks(selectedReception.id).length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400">هیچ کاری ثبت نشده است</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Form */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">خدمات انجام شده</h3>
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b pb-2">
                        <div className="col-span-5">نام خدمت</div>
                        <div className="col-span-3">مبلغ (تومان)</div>
                        <div className="col-span-2">تعداد</div>
                        <div className="col-span-2">عملیات</div>
                      </div>
                      
                      {billingData.services.map((service, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="نام خدمت"
                            value={service.name}
                            onChange={(e) => updateServiceItem(index, 'name', e.target.value)}
                            className="input col-span-5"
                          />
                          <input
                            type="text"
                            placeholder="۰"
                            value={service.price ? formatNumber(service.price) : ''}
                            onChange={(e) => {
                              const numValue = parseFormattedNumber(e.target.value);
                              updateServiceItem(index, 'price', numValue);
                            }}
                            className="input col-span-3 text-left"
                            dir="ltr"
                          />
                          <input
                            type="text"
                            placeholder="۱"
                            value={formatQuantity(service.quantity)}
                            onChange={(e) => {
                              const numValue = parseFormattedNumber(e.target.value);
                              updateServiceItem(index, 'quantity', numValue || 1);
                            }}
                            className="input col-span-2 text-center"
                          />
                          <button
                            onClick={() => removeServiceItem(index)}
                            className="col-span-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-center"
                          >
                            <X size={16} className="mx-auto" />
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addServiceItem} className="w-full">
                        + افزودن خدمت
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">قطعات مصرفی</h3>
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b pb-2">
                        <div className="col-span-5">نام قطعه</div>
                        <div className="col-span-3">مبلغ (تومان)</div>
                        <div className="col-span-2">تعداد</div>
                        <div className="col-span-2">عملیات</div>
                      </div>
                      
                      {billingData.parts.map((part, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="نام قطعه"
                            value={part.name}
                            onChange={(e) => updatePartItem(index, 'name', e.target.value)}
                            className="input col-span-5"
                          />
                          <input
                            type="text"
                            placeholder="۰"
                            value={part.price ? formatNumber(part.price) : ''}
                            onChange={(e) => {
                              const numValue = parseFormattedNumber(e.target.value);
                              updatePartItem(index, 'price', numValue);
                            }}
                            className="input col-span-3 text-left"
                            dir="ltr"
                          />
                          <input
                            type="text"
                            placeholder="۱"
                            value={formatQuantity(part.quantity)}
                            onChange={(e) => {
                              const numValue = parseFormattedNumber(e.target.value);
                              updatePartItem(index, 'quantity', numValue || 1);
                            }}
                            className="input col-span-2 text-center"
                          />
                          <button
                            onClick={() => removePartItem(index)}
                            className="col-span-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-center"
                          >
                            <X size={16} className="mx-auto" />
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addPartItem} className="w-full">
                        + افزودن قطعه
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">تخفیف (%)</label>
                      <input
                        type="text"
                        value={formatQuantity(billingData.discount)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          setBillingData(prev => ({ ...prev, discount: numValue || 0 }));
                        }}
                        className="input text-center"
                        placeholder="۰"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">مالیات (%)</label>
                      <input
                        type="text"
                        value={formatQuantity(billingData.tax)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          setBillingData(prev => ({ ...prev, tax: numValue || 0 }));
                        }}
                        className="input text-center"
                        placeholder="۹"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">خلاصه فاکتور</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>جمع خدمات:</span>
                        <span className="font-mono">{formatCurrency(billingData.services.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>جمع قطعات:</span>
                        <span className="font-mono">{formatCurrency(billingData.parts.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>تخفیف ({formatQuantity(billingData.discount)}%):</span>
                        <span className="font-mono">-{formatCurrency(((billingData.services.reduce((sum, item) => sum + (item.price * item.quantity), 0) + billingData.parts.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billingData.discount / 100))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>مالیات ({formatQuantity(billingData.tax)}%):</span>
                        <span className="font-mono">{formatCurrency((((billingData.services.reduce((sum, item) => sum + (item.price * item.quantity), 0) + billingData.parts.reduce((sum, item) => sum + (item.price * item.quantity), 0)) - ((billingData.services.reduce((sum, item) => sum + (item.price * item.quantity), 0) + billingData.parts.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billingData.discount / 100)) * billingData.tax / 100))}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>مجموع کل:</span>
                          <span className="font-mono text-green-600 dark:text-green-400">{formatCurrency(calculateTotal())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowBillingModal(false)}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinalizeBilling}
                >
                  ثبت نهایی و تکمیل خدمات
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleList;