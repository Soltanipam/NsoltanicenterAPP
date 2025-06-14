import React, { useState, useRef } from 'react';
import { Calendar, User, Car, FileText, Download, Save, Printer } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { createPersianPDF, addPersianText, addEnglishText, addTextBox } from '../../utils/pdfUtils';
import { englishToPersian, persianToEnglish } from '../../utils/numberUtils';
import moment from 'moment-jalaali';
import { toast } from 'react-hot-toast';

interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  
  // Vehicle Information
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  plateNumber: string;
  chassisNumber: string;
  engineNumber: string;
  color: string;
  
  // Service Information
  serviceType: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedCost: string;
  notes: string;
  
  // Dates
  receptionDate: string;
  estimatedCompletion: string;
}

const PersianForm: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    nationalId: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    plateNumber: '',
    chassisNumber: '',
    engineNumber: '',
    color: '',
    serviceType: '',
    description: '',
    urgency: 'medium',
    estimatedCost: '',
    notes: '',
    receptionDate: moment().format('jYYYY/jMM/jDD'),
    estimatedCompletion: moment().add(3, 'days').format('jYYYY/jMM/jDD')
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Required fields validation
    if (!formData.firstName.trim()) newErrors.firstName = 'نام الزامی است';
    if (!formData.lastName.trim()) newErrors.lastName = 'نام خانوادگی الزامی است';
    if (!formData.nationalId.trim()) newErrors.nationalId = 'کد ملی الزامی است';
    if (!formData.phone.trim()) newErrors.phone = 'شماره تماس الزامی است';
    if (!formData.vehicleMake.trim()) newErrors.vehicleMake = 'برند خودرو الزامی است';
    if (!formData.vehicleModel.trim()) newErrors.vehicleModel = 'مدل خودرو الزامی است';
    if (!formData.serviceType.trim()) newErrors.serviceType = 'نوع خدمات الزامی است';

    // National ID validation (10 digits)
    if (formData.nationalId && !/^\d{10}$/.test(persianToEnglish(formData.nationalId))) {
      newErrors.nationalId = 'کد ملی باید ۱۰ رقم باشد';
    }

    // Phone validation
    if (formData.phone && !/^09\d{9}$/.test(persianToEnglish(formData.phone))) {
      newErrors.phone = 'شماره تماس معتبر نیست';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('لطفاً خطاهای فرم را برطرف کنید');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('فرم با موفقیت ثبت شد');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        nationalId: '',
        birthDate: '',
        phone: '',
        email: '',
        address: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        plateNumber: '',
        chassisNumber: '',
        engineNumber: '',
        color: '',
        serviceType: '',
        description: '',
        urgency: 'medium',
        estimatedCost: '',
        notes: '',
        receptionDate: moment().format('jYYYY/jMM/jDD'),
        estimatedCompletion: moment().add(3, 'days').format('jYYYY/jMM/jDD')
      });
    } catch (error) {
      toast.error('خطا در ثبت فرم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDF = async () => {
    try {
      const doc = createPersianPDF();
      let currentY = 25;

      // Header
      addPersianText(doc, 'فرم پذیرش خدمات خودرو', doc.internal.pageSize.width / 2, currentY, {
        align: 'center',
        fontSize: 18,
        fontStyle: 'bold'
      });
      currentY += 15;

      addPersianText(doc, 'سلطانی سنتر - برترین‌ها برای بهترین‌ها', doc.internal.pageSize.width / 2, currentY, {
        align: 'center',
        fontSize: 12
      });
      currentY += 20;

      // Form number and date
      addPersianText(doc, `شماره فرم: ${englishToPersian('001234')}`, 20, currentY, { fontSize: 10 });
      addPersianText(doc, `تاریخ: ${formData.receptionDate}`, 120, currentY, { fontSize: 10 });
      currentY += 15;

      // Separator line
      doc.setLineWidth(0.5);
      doc.line(20, currentY, doc.internal.pageSize.width - 20, currentY);
      currentY += 15;

      // Personal Information Section
      addPersianText(doc, 'اطلاعات شخصی', 20, currentY, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 12;

      const personalInfo = [
        ['نام', formData.firstName],
        ['نام خانوادگی', formData.lastName],
        ['کد ملی', formData.nationalId],
        ['تاریخ تولد', formData.birthDate],
        ['شماره تماس', formData.phone],
        ['ایمیل', formData.email]
      ];

      personalInfo.forEach(([label, value], index) => {
        const x = index % 2 === 0 ? 25 : 110;
        const y = currentY + Math.floor(index / 2) * 8;
        
        addPersianText(doc, `${label}:`, x, y, { fontSize: 10, fontStyle: 'bold' });
        if (label === 'کد ملی' || label === 'شماره تماس') {
          addEnglishText(doc, value || '-', x + 35, y, { fontSize: 10, align: 'left' });
        } else {
          addPersianText(doc, value || '-', x + 35, y, { fontSize: 10 });
        }
      });
      currentY += Math.ceil(personalInfo.length / 2) * 8 + 10;

      // Address
      addPersianText(doc, 'آدرس:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
      const addressHeight = addPersianText(doc, formData.address || '-', 25, currentY + 8, {
        fontSize: 10,
        maxWidth: doc.internal.pageSize.width - 50
      });
      currentY += addressHeight + 20;

      // Vehicle Information Section
      addPersianText(doc, 'اطلاعات خودرو', 20, currentY, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 12;

      const vehicleInfo = [
        ['برند', formData.vehicleMake],
        ['مدل', formData.vehicleModel],
        ['سال تولید', formData.vehicleYear],
        ['رنگ', formData.color],
        ['شماره پلاک', formData.plateNumber],
        ['شماره شاسی', formData.chassisNumber],
        ['شماره موتور', formData.engineNumber]
      ];

      vehicleInfo.forEach(([label, value], index) => {
        const x = index % 2 === 0 ? 25 : 110;
        const y = currentY + Math.floor(index / 2) * 8;
        
        addPersianText(doc, `${label}:`, x, y, { fontSize: 10, fontStyle: 'bold' });
        if (label === 'سال تولید' || label === 'شماره شاسی' || label === 'شماره موتور') {
          addEnglishText(doc, value || '-', x + 35, y, { fontSize: 10, align: 'left' });
        } else {
          addPersianText(doc, value || '-', x + 35, y, { fontSize: 10 });
        }
      });
      currentY += Math.ceil(vehicleInfo.length / 2) * 8 + 20;

      // Service Information Section
      addPersianText(doc, 'اطلاعات خدمات', 20, currentY, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 12;

      addPersianText(doc, 'نوع خدمات:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
      addPersianText(doc, formData.serviceType || '-', 70, currentY, { fontSize: 10 });
      currentY += 10;

      addPersianText(doc, 'اولویت:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
      const urgencyText = formData.urgency === 'high' ? 'بالا' : 
                         formData.urgency === 'medium' ? 'متوسط' : 'پایین';
      addPersianText(doc, urgencyText, 70, currentY, { fontSize: 10 });
      currentY += 10;

      if (formData.estimatedCost) {
        addPersianText(doc, 'تخمین هزینه:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
        addPersianText(doc, `${formData.estimatedCost} تومان`, 70, currentY, { fontSize: 10 });
        currentY += 10;
      }

      currentY += 5;

      // Description
      if (formData.description) {
        addPersianText(doc, 'شرح خدمات:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
        currentY += 8;
        const descHeight = addPersianText(doc, formData.description, 25, currentY, {
          fontSize: 10,
          maxWidth: doc.internal.pageSize.width - 50
        });
        currentY += descHeight + 10;
      }

      // Notes
      if (formData.notes) {
        addPersianText(doc, 'یادداشت‌ها:', 25, currentY, { fontSize: 10, fontStyle: 'bold' });
        currentY += 8;
        const notesHeight = addPersianText(doc, formData.notes, 25, currentY, {
          fontSize: 10,
          maxWidth: doc.internal.pageSize.width - 50
        });
        currentY += notesHeight + 15;
      }

      // Dates section
      addPersianText(doc, 'تاریخ‌های مهم', 20, currentY, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 12;

      addPersianText(doc, `تاریخ پذیرش: ${formData.receptionDate}`, 25, currentY, { fontSize: 10 });
      addPersianText(doc, `تخمین تکمیل: ${formData.estimatedCompletion}`, 110, currentY, { fontSize: 10 });
      currentY += 20;

      // Signature section
      addPersianText(doc, 'امضاء و تأیید', 20, currentY, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      currentY += 15;

      // Customer signature box
      addTextBox(doc, '', 25, currentY, 70, 25, {
        borderColor: [0, 0, 0]
      });
      addPersianText(doc, 'امضای مشتری', 25, currentY + 30, { fontSize: 9 });

      // Staff signature box
      addTextBox(doc, '', 110, currentY, 70, 25, {
        borderColor: [0, 0, 0]
      });
      addPersianText(doc, 'امضای کارشناس', 110, currentY + 30, { fontSize: 9 });

      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      addPersianText(doc, `تاریخ چاپ: ${moment().format('jYYYY/jMM/jDD HH:mm')}`, 20, footerY, {
        fontSize: 8
      });
      addPersianText(doc, 'این فرم دارای اعتبار قانونی است', doc.internal.pageSize.width / 2, footerY, {
        fontSize: 8,
        align: 'center'
      });

      // Save PDF
      const fileName = `فرم-پذیرش-${formData.lastName || 'نامشخص'}-${moment().format('jYYYY-jMM-jDD')}.pdf`;
      doc.save(fileName);
      
      toast.success('فایل PDF با موفقیت ایجاد شد');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('خطا در ایجاد فایل PDF');
    }
  };

  const printForm = () => {
    if (formRef.current) {
      const printContent = formRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="fa">
          <head>
            <meta charset="UTF-8">
            <title>فرم پذیرش خدمات</title>
            <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
            <style>
              * { font-family: 'Vazirmatn', 'Tahoma', sans-serif !important; }
              body { direction: rtl; margin: 20px; line-height: 1.6; }
              .no-print { display: none !important; }
              .print-header { text-align: center; margin-bottom: 30px; }
              .form-section { margin-bottom: 25px; page-break-inside: avoid; }
              .form-row { display: flex; margin-bottom: 10px; }
              .form-field { flex: 1; margin-left: 20px; }
              .signature-box { border: 1px solid #000; height: 60px; width: 200px; margin: 10px 0; }
              @media print {
                body { margin: 0; }
                .page-break { page-break-before: always; }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <h1>فرم پذیرش خدمات خودرو</h1>
              <h2>سلطانی سنتر - برترین‌ها برای بهترین‌ها</h2>
              <p>تاریخ: ${moment().format('jYYYY/jMM/jDD')}</p>
            </div>
            ${printContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          فرم پذیرش خدمات خودرو
        </h1>
        <p className="text-gray-600">
          سلطانی سنتر - برترین‌ها برای بهترین‌ها
        </p>
        <div className="mt-4 text-sm text-gray-500">
          شماره فرم: {englishToPersian('001234')} | تاریخ: {moment().format('jYYYY/jMM/jDD')}
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">اطلاعات شخصی</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نام <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`input ${errors.firstName ? 'border-red-500' : ''}`}
                placeholder="نام خود را وارد کنید"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نام خانوادگی <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`input ${errors.lastName ? 'border-red-500' : ''}`}
                placeholder="نام خانوادگی خود را وارد کنید"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                کد ملی <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => handleInputChange('nationalId', persianToEnglish(e.target.value))}
                className={`input ${errors.nationalId ? 'border-red-500' : ''}`}
                placeholder="کد ملی ۱۰ رقمی"
                maxLength={10}
                dir="ltr"
              />
              {errors.nationalId && (
                <p className="text-red-500 text-sm mt-1">{errors.nationalId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاریخ تولد
              </label>
              <input
                type="text"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className="input"
                placeholder="۱۳۷۰/۰۱/۰۱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره تماس <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', persianToEnglish(e.target.value))}
                className={`input ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ایمیل
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              آدرس
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="input"
              rows={3}
              placeholder="آدرس کامل خود را وارد کنید"
            />
          </div>
        </Card>

        {/* Vehicle Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Car className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">اطلاعات خودرو</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                برند خودرو <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vehicleMake}
                onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                className={`input ${errors.vehicleMake ? 'border-red-500' : ''}`}
              >
                <option value="">انتخاب کنید</option>
                <option value="پژو">پژو</option>
                <option value="سمند">سمند</option>
                <option value="پراید">پراید</option>
                <option value="تیبا">تیبا</option>
                <option value="دنا">دنا</option>
                <option value="رانا">رانا</option>
                <option value="سایر">سایر</option>
              </select>
              {errors.vehicleMake && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicleMake}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مدل خودرو <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                className={`input ${errors.vehicleModel ? 'border-red-500' : ''}`}
                placeholder="مدل خودرو"
              />
              {errors.vehicleModel && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicleModel}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سال تولید
              </label>
              <select
                value={formData.vehicleYear}
                onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                className="input"
              >
                <option value="">انتخاب کنید</option>
                {Array.from({ length: 30 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {englishToPersian(year.toString())}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رنگ خودرو
              </label>
              <select
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="input"
              >
                <option value="">انتخاب کنید</option>
                <option value="سفید">سفید</option>
                <option value="مشکی">مشکی</option>
                <option value="نقره‌ای">نقره‌ای</option>
                <option value="قرمز">قرمز</option>
                <option value="آبی">آبی</option>
                <option value="سایر">سایر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره پلاک
              </label>
              <input
                type="text"
                value={formData.plateNumber}
                onChange={(e) => handleInputChange('plateNumber', e.target.value)}
                className="input"
                placeholder="۱۲ج۳۴۵-۶۷"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره شاسی
              </label>
              <input
                type="text"
                value={formData.chassisNumber}
                onChange={(e) => handleInputChange('chassisNumber', persianToEnglish(e.target.value))}
                className="input"
                placeholder="شماره شاسی"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره موتور
              </label>
              <input
                type="text"
                value={formData.engineNumber}
                onChange={(e) => handleInputChange('engineNumber', persianToEnglish(e.target.value))}
                className="input"
                placeholder="شماره موتور"
                dir="ltr"
              />
            </div>
          </div>
        </Card>

        {/* Service Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">اطلاعات خدمات</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع خدمات <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleInputChange('serviceType', e.target.value)}
                className={`input ${errors.serviceType ? 'border-red-500' : ''}`}
              >
                <option value="">انتخاب کنید</option>
                <option value="تعویض روغن">تعویض روغن</option>
                <option value="تعمیر موتور">تعمیر موتور</option>
                <option value="تعمیر ترمز">تعمیر ترمز</option>
                <option value="بالانس چرخ">بالانس چرخ</option>
                <option value="تنظیم فرمان">تنظیم فرمان</option>
                <option value="تعمیر کولر">تعمیر کولر</option>
                <option value="سرویس کامل">سرویس کامل</option>
                <option value="سایر">سایر</option>
              </select>
              {errors.serviceType && (
                <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اولویت
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value as 'low' | 'medium' | 'high')}
                className="input"
              >
                <option value="low">پایین</option>
                <option value="medium">متوسط</option>
                <option value="high">بالا</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تخمین هزینه (تومان)
              </label>
              <input
                type="text"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', persianToEnglish(e.target.value))}
                className="input"
                placeholder="۱۰۰۰۰۰"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تخمین تاریخ تکمیل
              </label>
              <input
                type="text"
                value={formData.estimatedCompletion}
                onChange={(e) => handleInputChange('estimatedCompletion', e.target.value)}
                className="input"
                placeholder="۱۴۰۳/۰۱/۱۵"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شرح تفصیلی خدمات
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input"
              rows={4}
              placeholder="شرح کاملی از خدمات مورد نیاز ارائه دهید..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              یادداشت‌ها
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="input"
              rows={3}
              placeholder="یادداشت‌های اضافی..."
            />
          </div>
        </Card>

        {/* Dates */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">تاریخ‌های مهم</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاریخ پذیرش
              </label>
              <input
                type="text"
                value={formData.receptionDate}
                onChange={(e) => handleInputChange('receptionDate', e.target.value)}
                className="input"
                placeholder="۱۴۰۳/۰۱/۰۱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تخمین تکمیل
              </label>
              <input
                type="text"
                value={formData.estimatedCompletion}
                onChange={(e) => handleInputChange('estimatedCompletion', e.target.value)}
                className="input"
                placeholder="۱۴۰۳/۰۱/۰۵"
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-end no-print">
          <Button
            type="button"
            variant="outline"
            onClick={printForm}
            leftIcon={<Printer size={16} />}
          >
            چاپ فرم
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            onClick={generatePDF}
            leftIcon={<Download size={16} />}
          >
            دریافت PDF
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Save size={16} />}
          >
            ثبت فرم
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PersianForm;