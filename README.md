# سیستم مدیریت تعمیرگاه خودرو سلطانی سنتر

## نصب و راه‌اندازی

### 1. نصب وابستگی‌ها
```bash
npm install
```

### 2. تنظیم Google Sheets API

#### مرحله 1: ایجاد پروژه در Google Cloud Console
1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. پروژه جدید ایجاد کنید یا پروژه موجود را انتخاب کنید
3. نام پروژه: `Soltani Center Management`

#### مرحله 2: فعال‌سازی API های مورد نیاز
1. به بخش "APIs & Services" > "Library" بروید
2. API های زیر را جستجو و فعال کنید:
   - **Google Sheets API**
   - **Google Drive API**

#### مرحله 3: ایجاد Service Account
1. به "APIs & Services" > "Credentials" بروید
2. روی "Create Credentials" کلیک کنید
3. "Service Account" را انتخاب کنید
4. نام: `Soltani Center Service Account`
5. پس از ایجاد، کلید JSON را دانلود کنید

#### مرحله 4: تنظیم فایل Credentials
1. فایل JSON دانلود شده را در مسیر `config/credentials.json` قرار دهید
2. محتوای فایل باید شامل موارد زیر باشد:
```json
{
  "type": "service_account",
  "project_id": "your-actual-project-id",
  "private_key_id": "your-actual-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-actual-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

**⚠️ مهم:** فایل `credentials.json` موجود در پروژه حاوی مقادیر نمونه است و باید با اطلاعات واقعی Service Account خود جایگزین شود.

### 3. تنظیم Google Sheets

#### ایجاد Google Sheets فایل
1. یک Google Sheets جدید ایجاد کنید
2. شناسه فایل را از URL کپی کنید (بین `/d/` و `/edit`)
3. شناسه را در فایل `src/api/googleSheets.ts` در متغیر `spreadsheetId` قرار دهید

#### **مهم: اشتراک‌گذاری Google Sheets**
1. در Google Sheets خود، روی دکمه "Share" کلیک کنید
2. ایمیل Service Account (client_email از فایل credentials.json) را اضافه کنید
3. **حتماً دسترسی "Editor" را انتخاب کنید**
4. روی "Send" کلیک کنید

بدون این مرحله، سیستم قادر به اتصال به Google Sheets نخواهد بود.

#### ساختار شیت‌ها
فایل Google Sheets باید شامل شیت‌های زیر باشد:

**1. شیت users:**
```
id | username | name | role | job_description | active | permissions | settings | created_at | updated_at | email | auth_user_id
```

**2. شیت customers:**
```
id | customer_id | first_name | last_name | phone | password_hash | created_at | updated_at | email | can_login
```

**3. شیت receptions:**
```
id | customer_info | vehicle_info | service_info | status | images | documents | billing | completed_at | completed_by | created_at | updated_at
```

**4. شیت tasks:**
```
id | title | description | status | priority | assigned_to_id | assigned_to_name | vehicle_id | vehicle_info | due_date | images | history | created_at | updated_at
```

**5. شیت messages:**
```
id | from_user_id | to_user_id | subject | content | read | created_at
```

**6. شیت sms_settings:**
```
id | username | password_hash | from_number | enabled | templates | created_at | updated_at
```

**7. شیت sms_logs:**
```
id | to_number | message | status | template_used | cost | sent_at
```

#### اضافه کردن کاربر اولیه
در شیت `users` یک ردیف اولیه اضافه کنید:
```
1 | admin | مدیر سیستم | admin | مدیر کل سیستم | true | {"canViewReceptions":true,"canCreateTask":true,"canCreateReception":true,"canCompleteServices":true,"canManageCustomers":true,"canViewHistory":true} | {"sidebarOpen":true} | 2024-01-01 | 2024-01-01 | admin@soltanicenter.com | 1
```

### 4. اجرای برنامه

```bash
npm run dev
```

### 5. ورود به سیستم

**ورود کارکنان:**
- آدرس: `http://localhost:5173/login`
- نام کاربری: `admin`
- رمز عبور: `admin123`

**ورود مشتریان:**
- آدرس: `http://localhost:5173/customer-login`
- کد مشتری و شماره موبایل

## ویژگی‌ها

### 🔐 احراز هویت
- احراز هویت کارکنان با نام کاربری و رمز عبور
- احراز هویت مشتریان با کد مشتری و شماره موبایل
- مدیریت نقش‌ها و دسترسی‌ها

### 📊 مدیریت داده‌ها
- تمام داده‌ها در Google Sheets ذخیره می‌شوند
- عملیات CRUD کامل برای تمام موجودیت‌ها
- پشتیبانی از حالت آفلاین با کش محلی

### 🚗 مدیریت پذیرش خودرو
- ثبت اطلاعات مشتری و خودرو
- آپلود تصاویر و مدارک به Google Drive
- امضای دیجیتال
- چاپ فرم پذیرش

### 📋 مدیریت وظایف
- تخصیص وظایف به کارکنان
- پیگیری وضعیت انجام کارها
- آپلود تصاویر گزارش کار به Google Drive
- تاریخچه تغییرات

### 💬 سیستم پیام‌رسانی
- ارسال پیام بین کارکنان
- مدیریت پیامک به مشتریان
- قالب‌های پیامک

### 📱 پورتال مشتری
- مشاهده وضعیت خودرو
- پیگیری مراحل تعمیر
- مشاهده تصاویر و گزارش‌ها

## عیب‌یابی

### خطای "Failed to load credentials"
- بررسی کنید که فایل `credentials.json` در مسیر صحیح قرار دارد (`config/credentials.json`)
- محتوای فایل را بررسی کنید و مطمئن شوید که مقادیر واقعی Service Account را دارد
- مقادیر نمونه مانند "your-project-id-here" را با اطلاعات واقعی جایگزین کنید

### خطای "Spreadsheet not found"
- شناسه Google Sheets را در `src/api/googleSheets.ts` بررسی کنید
- مطمئن شوید که Google Sheets موجود است و قابل دسترسی است

### خطای "Permission denied"
- **مهم:** Service Account باید دسترسی "Editor" به Google Sheets داشته باشد
- Google Sheets را با ایمیل Service Account (client_email) به اشتراک بگذارید
- API های Google Sheets و Google Drive را در Google Cloud Console فعال کنید

### خطای "Connection timeout"
- اتصال اینترنت خود را بررسی کنید
- مطمئن شوید که فایروال یا پروکسی دسترسی به Google APIs را مسدود نکرده است

### خطای "Authentication failed"
- اطلاعات Service Account در فایل `credentials.json` را بررسی کنید
- مطمئن شوید که Service Account هنوز فعال است و حذف نشده است

## نکات مهم

1. **امنیت:** فایل `credentials.json` را هرگز در مخزن کد عمومی قرار ندهید
2. **دسترسی:** Service Account باید دسترسی "Editor" به Google Sheets داشته باشد
3. **شناسه شیت:** حتماً شناسه صحیح Google Sheets را در کد قرار دهید
4. **نسخه پشتیبان:** از Google Sheets خود نسخه پشتیبان تهیه کنید
5. **مقادیر واقعی:** فایل `credentials.json` موجود حاوی مقادیر نمونه است و باید جایگزین شود

## پشتیبانی

برای پشتیبانی و سوالات، با تیم توسعه تماس بگیرید.