import { useState } from 'react';
import { CheckCircle, Eye, Printer, Search, Calendar, User, Car, Receipt, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useReceptionStore } from '../../store/receptionStore';
import { formatLicensePlate, formatCurrency, englishToPersian } from '../../utils/numberUtils';
import { createPersianPDF, addPersianText, addEnglishText } from '../../utils/pdfUtils';
import moment from 'moment-jalaali';
import { toast } from 'react-hot-toast';

const CompletedReceptions = () => {
  const { getCompletedReceptions } = useReceptionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState<any>(null);

  const completedReceptions = getCompletedReceptions();

  const filteredReceptions = completedReceptions.filter(reception => 
    reception.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reception.customerInfo.phone.includes(searchQuery) ||
    reception.vehicleInfo.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reception.vehicleInfo.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reception.vehicleInfo.plateNumber.includes(searchQuery)
  );

  const handleViewDetails = (reception: any) => {
    setSelectedReception(reception);
    setShowDetailsModal(true);
  };

  const handlePrintReceipt = async (reception: any) => {
    try {
      const doc = createPersianPDF();
      let currentY = 20;

      // Header
      addPersianText(doc, 'فاکتور تکمیل خدمات', doc.internal.pageSize.width / 2, currentY, {
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

      // Separator line
      doc.setLineWidth(0.5);
      doc.line(20, currentY, doc.internal.pageSize.width - 20, currentY);
      currentY += 15;

      // Customer and Vehicle Info
      addPersianText(doc, 'اطلاعات مشتری و خودرو:', 20, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 10;

      const info = [
        ['مشتری:', reception.customerInfo.name],
        ['خودرو:', `${reception.vehicleInfo.make} ${reception.vehicleInfo.model}`],
        ['پلاک:', formatLicensePlate(reception.vehicleInfo.plateNumber)],
        ['تاریخ تکمیل:', reception.completedAt]
      ];

      info.forEach(([label, value]) => {
        addPersianText(doc, `${label} ${value}`, 25, currentY, { fontSize: 10 });
        currentY += 6;
      });

      currentY += 10;

      // Billing details
      if (reception.billing) {
        addPersianText(doc, 'جزئیات فاکتور:', 20, currentY, {
          fontSize: 12,
          fontStyle: 'bold'
        });
        currentY += 10;

        // Services
        if (reception.billing.services.length > 0) {
          addPersianText(doc, 'خدمات انجام شده:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
          currentY += 8;

          reception.billing.services.forEach((service: any) => {
            addPersianText(doc, `${service.name}`, 30, currentY, { fontSize: 9 });
            addPersianText(doc, formatCurrency(service.price * service.quantity), 150, currentY, { fontSize: 9 });
            currentY += 6;
          });
          currentY += 5;
        }

        // Parts
        if (reception.billing.parts.length > 0) {
          addPersianText(doc, 'قطعات مصرفی:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
          currentY += 8;

          reception.billing.parts.forEach((part: any) => {
            addPersianText(doc, `${part.name}`, 30, currentY, { fontSize: 9 });
            addPersianText(doc, formatCurrency(part.price * part.quantity), 150, currentY, { fontSize: 9 });
            currentY += 6;
          });
          currentY += 5;
        }

        // Total
        addPersianText(doc, 'مجموع کل:', 25, currentY, { fontSize: 12, fontStyle: 'bold' });
        addPersianText(doc, formatCurrency(reception.billing.total), 150, currentY, { 
          fontSize: 12, 
          fontStyle: 'bold' 
        });
      }

      // Save PDF
      const fileName = `فاکتور-${reception.customerInfo.name.replace(/\s+/g, '-')}-${moment().format('jYYYY-jMM-jDD')}.pdf`;
      doc.save(fileName);
      toast.success('فاکتور با موفقیت ایجاد شد');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('خطا در ایجاد فاکتور');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
            خودروهای تکمیل شده
          </h1>
          <p className="text-gray-600 dark:text-gray-400">مشاهده خودروهای تحویل شده و فاکتورها</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pr-10 w-full"
            placeholder="جستجو در خودروهای تکمیل شده..."
          />
        </div>
      </Card>

      <div className="space-y-4">
        {filteredReceptions.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">هیچ خودرو تکمیل شده‌ای یافت نشد</h3>
              <p>خودروهای تکمیل شده در اینجا نمایش داده می‌شوند</p>
            </div>
          </Card>
        ) : (
          filteredReceptions.map((reception) => (
            <Card key={reception.id} className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold text-lg">
                      {reception.vehicleInfo.make} {reception.vehicleInfo.model}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      تکمیل شده
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">مشتری:</p>
                      <p className="font-medium">{reception.customerInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">شماره تماس:</p>
                      <p className="font-medium ltr">{reception.customerInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">پلاک:</p>
                      <p className="font-medium">{formatLicensePlate(reception.vehicleInfo.plateNumber)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">تاریخ تکمیل:</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{reception.completedAt}</p>
                    </div>
                    {reception.completedBy && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">تکمیل شده توسط:</p>
                        <p className="font-medium">{reception.completedBy}</p>
                      </div>
                    )}
                    {reception.billing && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">مبلغ کل:</p>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(reception.billing.total)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye size={16} />}
                    onClick={() => handleViewDetails(reception)}
                  >
                    مشاهده جزئیات
                  </Button>
                  
                  {reception.billing && (
                    <Button
                      variant="success"
                      size="sm"
                      leftIcon={<Receipt size={16} />}
                      onClick={() => handlePrintReceipt(reception)}
                    >
                      چاپ فاکتور
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedReception && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDetailsModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                جزئیات خودرو تکمیل شده
              </h2>
              
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User size={16} />
                    اطلاعات مشتری
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">نام مشتری</p>
                      <p className="font-medium">{selectedReception.customerInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">شماره تماس</p>
                      <p className="font-medium ltr">{selectedReception.customerInfo.phone}</p>
                    </div>
                    {selectedReception.customerInfo.address && (
                      <div className="col-span-2">
                        <p className="text-gray-600 dark:text-gray-400 text-sm">آدرس</p>
                        <p className="font-medium">{selectedReception.customerInfo.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Car size={16} />
                    مشخصات خودرو
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">برند</p>
                      <p className="font-medium">{selectedReception.vehicleInfo.make}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">مدل</p>
                      <p className="font-medium">{selectedReception.vehicleInfo.model}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">سال تولید</p>
                      <p className="font-medium">{englishToPersian(selectedReception.vehicleInfo.year)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">رنگ</p>
                      <p className="font-medium">{selectedReception.vehicleInfo.color}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">پلاک</p>
                      <p className="font-medium">{formatLicensePlate(selectedReception.vehicleInfo.plateNumber)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">کیلومتر</p>
                      <p className="font-medium">{englishToPersian(selectedReception.vehicleInfo.mileage)} کیلومتر</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">تاریخ پذیرش</p>
                      <p className="font-medium">{selectedReception.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">تاریخ تکمیل</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{selectedReception.completedAt}</p>
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    خدمات انجام شده
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedReception.serviceInfo.description}</p>
                  </div>
                </div>

                {/* Billing Information */}
                {selectedReception.billing && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Receipt size={16} />
                      فاکتور نهایی
                    </h3>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Services */}
                        {selectedReception.billing.services.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">خدمات انجام شده:</h4>
                            <div className="space-y-2">
                              {selectedReception.billing.services.map((service: any, index: number) => (
                                <div key={index} className="flex justify-between bg-white dark:bg-gray-800 rounded p-2">
                                  <span className="text-sm">{service.name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(service.price * service.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Parts */}
                        {selectedReception.billing.parts.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">قطعات مصرفی:</h4>
                            <div className="space-y-2">
                              {selectedReception.billing.parts.map((part: any, index: number) => (
                                <div key={index} className="flex justify-between bg-white dark:bg-gray-800 rounded p-2">
                                  <span className="text-sm">{part.name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(part.price * part.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-green-300 dark:border-green-700">
                        <div className="flex justify-between items-center font-bold text-lg">
                          <span>مجموع کل:</span>
                          <span className="font-mono text-green-600 dark:text-green-400">
                            {formatCurrency(selectedReception.billing.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vehicle Images */}
                {selectedReception.images && selectedReception.images.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">تصاویر خودرو</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedReception.images.map((image: string, index: number) => (
                        <div key={index} className="relative aspect-video">
                          <img
                            src={image}
                            alt={`تصویر ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                {selectedReception.billing && (
                  <Button
                    variant="success"
                    leftIcon={<Receipt size={16} />}
                    onClick={() => handlePrintReceipt(selectedReception)}
                  >
                    چاپ فاکتور
                  </Button>
                )}
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
    </div>
  );
};

export default CompletedReceptions;