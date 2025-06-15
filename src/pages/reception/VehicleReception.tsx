import { useState, useEffect } from 'react';
import { Car, Save, Printer, ChevronRight, ChevronLeft, Upload, Search, UserPlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LicensePlateInput from '../../components/ui/LicensePlateInput';
import { useAuthStore } from '../../store/authStore';
import { useCustomerStore } from '../../store/customerStore';
import { useReceptionStore } from '../../store/receptionStore';
import { persianToEnglish } from '../../utils/numberUtils';
import { googleDriveService } from '../../services/googleDrive';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-hot-toast';

const VehicleReception = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get reception ID from URL if editing
  const { user } = useAuthStore();
  const { customers, addCustomer, getCustomerByPhone } = useCustomerStore();
  const { receptions, addReception, updateReception } = useReceptionStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [signatureRef, setSignatureRef] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Customer Info
    customerId: '',
    firstName: '',
    lastName: '',
    phone: '',
    
    // Vehicle Info
    make: '',
    customMake: '',
    model: '',
    year: '',
    color: '',
    customColor: '',
    vin: '',
    mileage: '',
    plateNumber: '',
    
    // Service Info
    customerRequests: '',
    receptionistNotes: '',
    signature: null as string | null,
    
    // Documents
    vehicleImages: [] as File[],
    documents: [] as File[],
  });

  // Load reception data if editing
  useEffect(() => {
    if (id) {
      const reception = receptions.find(r => r.id === id);
      if (reception) {
        // Split the full name into first and last name
        const nameParts = reception.customerInfo.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          customerId: reception.customerInfo.id || '',
          firstName: firstName,
          lastName: lastName,
          phone: reception.customerInfo.phone,
          make: reception.vehicleInfo.make,
          customMake: reception.vehicleInfo.make,
          model: reception.vehicleInfo.model,
          year: reception.vehicleInfo.year,
          color: reception.vehicleInfo.color,
          customColor: reception.vehicleInfo.color,
          vin: reception.vehicleInfo.vin,
          mileage: reception.vehicleInfo.mileage,
          plateNumber: reception.vehicleInfo.plateNumber,
          customerRequests: reception.serviceInfo.customerRequests?.[0] || '',
          receptionistNotes: reception.serviceInfo.description,
          signature: reception.serviceInfo.signature,
          vehicleImages: [], // Can't load existing files, only URLs
          documents: [],
        });
      } else {
        toast.error('پذیرش مورد نظر یافت نشد');
        navigate('/reception/list');
      }
    }
  }, [id, receptions, navigate]);

  const filteredCustomers = customers.filter(customer => 
    (customer.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone || '').includes(searchQuery) ||
    (customer.customerId || '').includes(searchQuery)
  );

  const handleCustomerSelect = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone
    }));
    setShowCustomerModal(false);
  };

  const carBrands = ['مرسدس بنز', 'بی‌ام‌و', 'پورشه', 'ولوو', 'VW', 'سایر'];
  const colors = ['سفید', 'مشکی', 'قهوه‌ای', 'سایر'];
  const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());

  const uploadFiles = async (files: File[], path: string): Promise<string[]> => {
    const uploadPromises = files.map(file => googleDriveService.uploadFile(file, path));
    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== null) as string[];
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate current step
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        toast.error('لطفاً نام، نام خانوادگی و شماره تماس را وارد کنید');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.make || !formData.model || !formData.year || !formData.vin || !formData.mileage) {
        toast.error('لطفاً تمام اطلاعات خودرو را وارد کنید');
        return;
      }
      if (formData.make === 'سایر' && !formData.customMake) {
        toast.error('لطفاً برند خودرو را وارد کنید');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.customerRequests || !formData.receptionistNotes) {
        toast.error('لطفاً درخواست مشتری و شرح پذیرشگر را وارد کنید');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUploading(true);
      
      // Upload images and documents to Google Drive
      const imageUrls = formData.vehicleImages.length > 0 
        ? await uploadFiles(formData.vehicleImages, 'vehicle-images')
        : [];
      
      const documentUrls = formData.documents.length > 0 
        ? await uploadFiles(formData.documents, 'documents')
        : [];

      // Check if customer exists
      const existingCustomer = getCustomerByPhone(formData.phone);
      let customerId = formData.customerId;
      
      if (!existingCustomer && !formData.customerId) {
        // Create new customer with generated email
        const customerEmail = `${persianToEnglish(formData.phone)}@soltanicenter.com`;
        const newCustomer = await addCustomer({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: persianToEnglish(formData.phone), // Convert Persian numbers
          email: customerEmail,
          canLogin: true
        });
        customerId = newCustomer.id;
        toast.success('مشتری جدید با موفقیت ثبت شد');
      } else if (existingCustomer) {
        customerId = existingCustomer.id;
      }

      // Get signature data
      const signatureData = signatureRef?.getTrimmedCanvas().toDataURL() || formData.signature;

      // Create reception data with URLs instead of File objects
      const receptionData = {
        customerInfo: {
          name: `${formData.firstName} ${formData.lastName}`,
          phone: persianToEnglish(formData.phone), // Convert Persian numbers
          nationalId: '',
          address: ''
        },
        vehicleInfo: {
          make: formData.make === 'سایر' ? formData.customMake : formData.make,
          model: formData.model,
          year: formData.year,
          color: formData.color === 'سایر' ? formData.customColor : formData.color,
          plateNumber: formData.plateNumber || 'نامشخص',
          vin: persianToEnglish(formData.vin), // Convert Persian numbers
          mileage: persianToEnglish(formData.mileage) // Convert Persian numbers
        },
        serviceInfo: {
          description: formData.receptionistNotes,
          customerRequests: [formData.customerRequests],
          signature: signatureData
        },
        images: imageUrls.length > 0 ? imageUrls : undefined,
        documents: documentUrls.length > 0 ? documentUrls : undefined
      };

      if (id) {
        // Update existing reception
        await updateReception(id, receptionData);
        toast.success('پذیرش با موفقیت ویرایش شد');
      } else {
        // Create new reception
        await addReception(receptionData);
        toast.success('پذیرش با موفقیت ثبت شد');
      }
      
      navigate('/reception/list');
    } catch (error) {
      console.error('Error submitting reception:', error);
      toast.error('خطا در ثبت پذیرش');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'vehicleImages' | 'documents') => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card title="اطلاعات مشتری">
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerModal(true)}
                  className="w-full"
                >
                  انتخاب از لیست مشتریان
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نام</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">نام خانوادگی</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">تلفن همراه</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: persianToEnglish(e.target.value) })}
                  className="input"
                  required
                  dir="ltr"
                />
              </div>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card title="اطلاعات خودرو">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">برند خودرو</label>
                  <select
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {carBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">مدل خودرو</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input"
                    placeholder="مثال: C200 یا X5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">سال تولید</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">رنگ خودرو</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">شماره شاسی (VIN)</label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: persianToEnglish(e.target.value) })}
                    className="input"
                    maxLength={17}
                    minLength={17}
                    required
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">کیلومتر کارکرد</label>
                  <input
                    type="text"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: persianToEnglish(e.target.value) })}
                    className="input"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {formData.make === 'سایر' && (
                <div>
                  <label className="block text-sm font-medium mb-1">برند دلخواه</label>
                  <input
                    type="text"
                    value={formData.customMake}
                    onChange={(e) => setFormData({ ...formData, customMake: e.target.value })}
                    className="input"
                    placeholder="برند خودرو را وارد کنید"
                    required
                  />
                </div>
              )}

              {formData.color === 'سایر' && (
                <div>
                  <label className="block text-sm font-medium mb-1">رنگ دلخواه</label>
                  <input
                    type="text"
                    value={formData.customColor}
                    onChange={(e) => setFormData({ ...formData, customColor: e.target.value })}
                    className="input"
                    placeholder="رنگ دلخواه"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">شماره پلاک (اختیاری)</label>
                <LicensePlateInput
                  value={formData.plateNumber}
                  onChange={(value) => setFormData({ ...formData, plateNumber: value })}
                />
                <p className="text-sm text-gray-500 mt-1">در صورت عدم وارد کردن، به صورت خودکار "نامشخص" ثبت می‌شود</p>
              </div>
            </div>
          </Card>
        );

      case 3:
        return (
          <Card title="اطلاعات سرویس">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">درخواست‌های مشتری</label>
                <textarea
                  value={formData.customerRequests}
                  onChange={(e) => setFormData({ ...formData, customerRequests: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="درخواست‌های مشتری را وارد کنید..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">شرح پذیرشگر</label>
                <textarea
                  value={formData.receptionistNotes}
                  onChange={(e) => setFormData({ ...formData, receptionistNotes: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="توضیحات و مشاهدات پذیرشگر را وارد کنید..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">امضای مشتری</label>
                <div className="border rounded-lg p-4 bg-white">
                  <SignatureCanvas
                    ref={(ref) => setSignatureRef(ref)}
                    canvasProps={{
                      className: 'signature-canvas w-full h-40 border rounded cursor-crosshair',
                      style: { backgroundColor: '#fff' }
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">لطفاً در کادر بالا امضا کنید</p>
              </div>
            </div>
          </Card>
        );

      case 4:
        return (
          <Card title="بارگذاری تصاویر و مدارک">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">تصاویر خودرو</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'vehicleImages')}
                    className="hidden"
                    id="vehicle-images"
                  />
                  <label
                    htmlFor="vehicle-images"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">برای آپلود تصاویر خودرو کلیک کنید</span>
                  </label>
                  {formData.vehicleImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.vehicleImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`تصویر ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">مدارک و اسناد</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleImageUpload(e, 'documents')}
                    className="hidden"
                    id="documents"
                  />
                  <label
                    htmlFor="documents"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">برای آپلود مدارک کلیک کنید</span>
                  </label>
                  {formData.documents.length > 0 && (
                    <div className="mt-4">
                      <ul className="space-y-2">
                        {formData.documents.map((file, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Car className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">
            {id ? 'ویرایش پذیرش خودرو' : 'پذیرش خودرو'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {id ? 'ویرایش اطلاعات پذیرش خودرو' : 'ثبت اطلاعات پذیرش خودرو'}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 relative ${
                step < currentStep
                  ? 'text-accent'
                  : step === currentStep
                  ? 'text-accent'
                  : 'text-gray-400'
              }`}
            >
              <div className="h-1 absolute left-0 right-0 top-4 transform -translate-y-1/2 bg-gray-200">
                <div
                  className={`h-full bg-accent transition-all duration-300 ${
                    step <= currentStep ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step <= currentStep
                      ? 'bg-accent text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step}
                </div>
                <span className="mt-2 text-sm">
                  {step === 1
                    ? 'اطلاعات مشتری'
                    : step === 2
                    ? 'اطلاعات خودرو'
                    : step === 3
                    ? 'اطلاعات سرویس'
                    : 'تصاویر و مدارک'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={currentStep === 4 ? handleSubmit : handleNextStep} className="space-y-6">
        {renderStep()}

        <div className="flex justify-end gap-4">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              leftIcon={<ChevronRight size={16} />}
              disabled={isUploading}
            >
              مرحله قبل
            </Button>
          )}
          
          {currentStep === 4 && (
            <Button
              type="button"
              variant="outline"
              leftIcon={<Printer size={16} />}
              onClick={() => {/* Handle print */}}
              disabled={isUploading}
            >
              چاپ فرم
            </Button>
          )}
          
          {currentStep < 4 ? (
            <Button
              type="submit"
              variant="primary"
              rightIcon={<ChevronLeft size={16} />}
              disabled={isUploading}
            >
              مرحله بعد
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save size={16} />}
              disabled={isUploading}
            >
              {isUploading ? 'در حال آپلود...' : (id ? 'به‌روزرسانی' : 'ثبت نهایی')}
            </Button>
          )}
        </div>
      </form>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCustomerModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
              <h2 className="text-xl font-bold mb-6">انتخاب مشتری</h2>
              
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pr-10 w-full"
                    placeholder="جستجوی مشتری..."
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        کد مشتری
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        نام و نام خانوادگی
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        شماره تماس
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {customer.customerId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm ltr">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            انتخاب
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          مشتری‌ای یافت نشد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerModal(false)}
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

export default VehicleReception;