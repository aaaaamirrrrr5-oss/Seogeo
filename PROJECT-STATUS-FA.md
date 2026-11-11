# وضعیت پروژه Site Manager 3.12.0 Ultimate — dev1

تاریخ: ۸ نوامبر ۲۰۲۶
وضعیت کلی: در حال توسعه؛ تحویل نهایی انجام نشده است.

## خلاصه اجرایی
این بسته یک مرحله توسعه واقعی روی سورس دریافت‌شده است. نسخه توسعه‌ای `3.12.0-dev1` است و نباید به‌عنوان انتشار تجاری یا نسخه نهایی نصب شود.

## ورودی‌های بررسی‌شده
- قالب `beano-coffee-v27.zip`
- افزونه `site-manager-bridge-v3_11_3.zip`
- اپلیکیشن `site-manager-android-v3_11_3.zip`

## تغییرات این مرحله
### Bridge
- افزودن REST route: `GET /smb/v3/theme/schema`.
- افزودن مجوز مدیر سایت برای کشف Schema.
- افزودن متادیتای پوسته فعال: نام، نسخه، stylesheet، template، URI و تشخیص child theme.
- افزودن فهرست وضعیت Adapterها برای Beano Hub، WordPress Settings API، Customizer، Redux، Kirki و ACF Options.
- افزودن متادیتای گزینه‌های `show_in_rest` ثبت‌شده، با حذف نام‌ها/Schemaهای حساس.
- افزودن fingerprint پایدار Schema که timestamp در آن دخالت ندارد.
- افزودن مسیر به کاتالوگ API.
- افزودن تست قرارداد ایستا.

### Android
- افزودن صفحه «مدیریت تنظیمات قالب» به بخش Beano.
- نمایش نام و نسخه پوسته و وضعیت Adapterها.
- دریافت گزینه‌های REST ثبت‌شده از endpoint موجود.
- نمایش کنترل‌های متن، عدد، boolean، enum و JSON.
- اعتبارسنجی اولیه نوع داده و تأیید صریح قبل از ذخیره.
- ذخیره از مسیر موجود `POST /registered-settings`.

### مستندات
- افزودن سند الزام‌آور `docs/ULTIMATE-SPEC-FA.md`.
- افزودن گزارش مرحله‌ای و changelog فارسی.

## فایل‌های تغییرکرده
### Bridge
- `site-manager-bridge.php`
- `CHANGELOG-fa.md`
- `DEVELOPMENT-REPORT-FA-3.12.0.md`
- `docs/ULTIMATE-SPEC-FA.md`
- `tests/theme-schema-contract.php`

### Android
- `www/index.html`
- `package.json`
- `CHANGELOG-fa.md`
- `DEVELOPMENT-REPORT-FA-3.12.0.md`
- `docs/ULTIMATE-SPEC-FA.md`
- `tests/theme-schema-ui.test.cjs`

## نتایج تست واقعی در محیط توسعه
### Bridge
- PHP lint: موفق.
- Theme schema contract: موفق، ۱۲ کنترل قرارداد.
- REST route catalog: موفق، ۸۱ مسیر.
- Action scopes: موفق، ۳۲ محدوده.
- Regex compile: موفق، ۵۷ الگو.
- Security invariants: موفق، ۱۷ کنترل.

### Android
- inline script syntax: موفق.
- inline handler test: موفق، ۲۱۳ تابع.
- theme schema UI contract: موفق، ۹ کنترل.
- Plus logic: موفق.
- `npm test`: ناقص؛ اجرای تست DOM به دلیل نبود ماژول `jsdom` متوقف شد.
- ساخت APK: انجام نشده؛ Android SDK/Gradle در محیط حاضر در دسترس نیست.

## کنترل عدم تغییر قالب
تمام ۸۲ فایل واقعی قالب با محتوای آرشیو ورودی مقایسه شدند؛ هیچ اختلافی پیدا نشد.
هیچ فایل PHP/CSS/JS یا فایل دیگری در قالب تغییر نکرده است.

## وضعیت Adapterها
- Beano Hub: Adapter قبلی حفظ شده؛ هر بخش تنها به اندازه‌ای پشتیبانی می‌شود که callback واقعی آن پیاده‌سازی کرده باشد.
- WordPress Settings API: گزینه‌های صریحاً REST-registered و غیرحساس قابل نمایش/ذخیره‌اند.
- Customizer: شناسایی چارچوب؛ Adapter خواندن/نوشتن هنوز پیاده‌سازی نشده.
- Redux: شناسایی چارچوب؛ Adapter خواندن/نوشتن هنوز پیاده‌سازی نشده.
- Kirki: شناسایی چارچوب؛ Adapter خواندن/نوشتن هنوز پیاده‌سازی نشده.
- ACF Options: شناسایی چارچوب؛ فقط وضعیت read-only اعلام می‌شود، نه ذخیره.
- Repeater، media، font، icon، dimensions، conditional و rich-text عمومی هنوز در موتور Schema پیاده‌سازی نشده‌اند.

## سه قابلیت اختصاصی
- مدیریت کارکنان با مجوز چندبعدی: هنوز تکمیل نشده.
- گردش تأیید و Audit کامل: هنوز تکمیل نشده.
- مرکز کنترل چندفروشگاهی با tenant isolation و داشبورد تجمیعی: هنوز تکمیل نشده.
- دستیار هوشمند عملیاتی فارسی با allowlisted tools، preview و approval: هنوز تکمیل نشده.

## تست‌های نیازمند محیط خارجی
- نصب افزونه روی staging وردپرس و تست endpoint واقعی.
- ذخیره و بازخوانی تنظیمات در WordPress database.
- مشاهده اثر تغییرات در سایت.
- تست با مدیر، ویرایشگر، انباردار و حسابدار.
- تست جداسازی چند فروشگاه.
- تست اجرای AI با سرویس‌دهنده مشخص و سیاست هزینه.
- ساخت APK و نصب/آزمون روی دستگاه واقعی.
- تکمیل `npm test` پس از نصب وابستگی `jsdom`.

## وابستگی‌ها و موانع
- سایت staging WordPress + WooCommerce و حساب‌های نقش مختلف.
- Android SDK، Gradle و دستگاه یا شبیه‌ساز.
- نصب وابستگی‌های npm برای DOM tests.
- تصمیم و اعتبارنامه جداگانه ارائه‌دهنده AI.
- برای adapterهای پوسته‌های دیگر، نمونه واقعی هر framework و نسخه آن.

## نقطه ادامه پیشنهادی
1. تکمیل Customizer adapter با کنترل‌های ثبت‌شده و ذخیره از WP_Customize_Setting API.
2. افزودن discovery/read-only واقعی برای Redux، Kirki و ACF با version guards.
3. پیاده‌سازی write adapter اختصاصی فقط برای frameworkهایی که API ذخیره امن و capability قابل اثبات دارند.
4. تکمیل renderer کنترل‌های پیشرفته Android و وضعیت dirty/undo/reset.
5. شروع RBAC چندبعدی و محدودسازی داده در Bridge.
6. افزودن tenant registry و گزارش تجمیعی چندفروشگاهی.
7. افزودن AI ability registry، preview، approval و audit.
8. تست staging و ساخت APK.

## دستور ادامه کار
«از بسته `Site Manager 3.12.0-dev1` ادامه بده. ابتدا `PROJECT-STATUS-FA.md` و `docs/ULTIMATE-SPEC-FA.md` را بخوان. قالب Beano Coffee را فقط‌خواندنی نگه دار. ابتدا Adapter امن Customizer و کنترل‌های پیشرفته مدیریت قالب را تکمیل کن، سپس RBAC چندبعدی، مرکز چندفروشگاهی و دستیار هوشمند عملیاتی را طبق سند پیاده‌سازی و تست کن. هیچ قابلیت تست‌نشده‌ای را کامل اعلام نکن.»


## افزوده نسخه 4.9.3
- مرکز ممیزی اولیه SEO/GEO/AEO در افزونه Bridge اضافه شد؛ رتبه واقعی یا میزان استناد در مدل‌های مولد ادعا نمی‌شود.
