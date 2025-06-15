# راهنمای تنظیم Google Sheets برای سیستم سلطانی سنتر

## ساختار مورد نیاز برای جداول

### 1. جدول users
ساختار فعلی شما:
```
id,username,name,role,job_description,active,permissions,settings,created_at,updated_at,email,auth_user_id
```

**باید ستون `password` اضافه شود:**
```
id,username,name,role,job_description,active,permissions,settings,created_at,updated_at,email,auth_user_id,password
```

### 2. کاربر اولیه برای تست
در جدول `users` این ردیف را اضافه کنید:

```
test123,aliuser,علی تستی,admin,مدیر سیستم,true,"{""canViewReceptions"":true,""canCreateTask"":true,""canCreateReception"":true,""canCompleteServices"":true,""canManageCustomers"":true,""canViewHistory"":true}","{""sidebarOpen"":true}",1403/10/01,1403/10/01,admin@soltanicenter.com,,
```

**نکته مهم:** ستون password خالی گذاشته شده چون سیستم خودکار رمز عبور را هش می‌کند.

### 3. جداول اضافی مورد نیاز

#### جدول customers:
```
id,code,name,phone,email,online_access,created_at,updated_at
```

#### جدول receptions:
```
id,customer_info,vehicle_info,service_info,status,images,documents,billing,completed_at,completed_by,created_at,updated_at
```

#### جدول tasks:
```
id,title,description,status,priority,assigned_to_id,assigned_to_name,vehicle_info,due_date,images,history,created_at,updated_at
```

#### جدول messages:
```
id,from_user_id,to_user_id,subject,content,read,created_at
```

## مراحل تنظیم:

### مرحله 1: به‌روزرسانی جدول users
1. به Google Sheets خود بروید
2. در جدول `users` ستون `password` را اضافه کنید
3. ردیف کاربر admin را اضافه کنید (بدون رمز عبور)

### مرحله 2: ایجاد جداول جدید
برای هر جدول یک sheet جدید ایجاد کنید با نام‌های:
- `customers`
- `receptions` 
- `tasks`
- `messages`

### مرحله 3: تنظیم رمز عبور اولیه
1. سیستم را راه‌اندازی کنید
2. با نام کاربری `aliuser` وارد شوید
3. به بخش مدیریت کاربران بروید
4. رمز عبور برای کاربر admin تنظیم کنید

## نحوه ورود:
- نام کاربری: `aliuser`
- رمز عبور: (که توسط مدیر تنظیم می‌شود)

## ویژگی‌های سیستم:
- ✅ رمز عبور هش شده ذخیره می‌شود
- ✅ امکان ورود با نام کاربری یا ایمیل
- ✅ کار در حالت آفلاین پس از ورود اولیه
- ✅ همگام‌سازی خودکار هنگام اتصال مجدد