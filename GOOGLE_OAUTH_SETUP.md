# راهنمای تنظیم Google OAuth و Google Sheets

## مرحله 1: ایجاد پروژه در Google Cloud Console

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. پروژه جدید ایجاد کنید یا پروژه موجود را انتخاب کنید
3. نام پروژه: `Soltani Center Management`

## مرحله 2: فعال‌سازی API های مورد نیاز

1. به بخش "APIs & Services" > "Library" بروید
2. API های زیر را جستجو و فعال کنید:
   - **Google Sheets API**
   - **Google Drive API**
   - **Google+ API** (برای اطلاعات کاربر)

## مرحله 3: ایجاد OAuth 2.0 Credentials

1. به "APIs & Services" > "Credentials" بروید
2. روی "Create Credentials" کلیک کنید
3. "OAuth 2.0 Client IDs" را انتخاب کنید
4. Application type: **Web application**
5. Name: `Soltani Center Web Client`

### تنظیم Authorized redirect URIs:
```
http://localhost:5173/auth/callback
https://yourdomain.com/auth/callback
```

## مرحله 4: دریافت Client ID و Client Secret

پس از ایجاد، اطلاعات زیر را دریافت خواهید کرد:
- **Client ID**: مثل `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: مثل `GOCSPX-abcdef123456`

## مرحله 5: تنظیم در کد

فایل `src/config/googleConfig.ts` را ویرایش کنید:

```typescript
export const GOOGLE_CONFIG = {
  SPREADSHEET_ID: '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w',
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
  CLIENT_SECRET: 'YOUR_CLIENT_SECRET_HERE',
  REDIRECT_URI: window.location.origin + '/auth/callback',
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};
```

## مرحله 6: تنظیم Google Sheets

### ساختار جدول users:
```
id | username | name | role | job_description | active | permissions | settings | created_at | updated_at | email | auth_user_id
```

### ساختار جدول customers:
```
id | code | name | phone | email | online_access | created_at | updated_at
```

### ساختار جدول receptions:
```
id | customer_id | date | vehicle_info | status | billing | completed_at | completed_by
```

### ساختار جدول tasks:
```
id | title | description | status | priority | assigned_to_id | assigned_to_name | vehicle_info | due_date | images | history | created_at | updated_at
```

### ساختار جدول messages:
```
id | from_user_id | to_user_id | subject | content | read | created_at
```

## مرحله 7: اضافه کردن کاربر اولیه

در جدول `users` یک ردیف اولیه اضافه کنید:

```csv
test123,admin,مدیر سیستم,admin,مدیر کل سیستم,true,"{""canViewReceptions"":true,""canCreateTask"":true,""canCreateReception"":true,""canCompleteServices"":true,""canManageCustomers"":true,""canViewHistory"":true}","{""sidebarOpen"":true}",1403/10/01,1403/10/01,admin@soltanicenter.com,
```

رمز عبور: `admin123` (هش شده در سیستم ذخیره می‌شود)

## مرحله 8: تست سیستم

1. سرور را راه‌اندازی کنید: `npm run dev`
2. به `http://localhost:5173/login` بروید
3. با نام کاربری `admin` و رمز `admin123` وارد شوید

## نکات مهم:

1. **امنیت**: Client Secret را هرگز در کد frontend قرار ندهید
2. **HTTPS**: در production حتماً از HTTPS استفاده کنید
3. **Domain**: Authorized domains را در Google Console تنظیم کنید
4. **Backup**: از Google Sheets خود backup تهیه کنید

## عیب‌یابی:

### خطای "Access blocked"
- بررسی کنید که OAuth consent screen تنظیم شده باشد
- Domain verification انجام دهید

### خطای "Invalid redirect URI"
- URL های redirect را دقیقاً بررسی کنید
- HTTP vs HTTPS را چک کنید

### خطای "Insufficient permissions"
- API های مورد نیاز را فعال کنید
- Scopes را بررسی کنید