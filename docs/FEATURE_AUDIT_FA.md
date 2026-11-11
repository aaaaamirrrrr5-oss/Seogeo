# ممیزی کامل قابلیت‌ها — Site Manager 3.12.0-dev1 (بازنگری ۲، با PHP)

تاریخ: ۸ نوامبر ۲۰۲۶
روش: خواندن سورس Android و Bridge، به‌علاوه ابزار تکرارپذیر `tests/audit-route-matrix.php` که ماتریس مسیر ↔ مجوز ↔ استفاده در اپ را از روی سورس می‌سازد.
**هیچ کد عملیاتی در این مرحله تغییر نکرد.** تنها افزوده‌ها: این ممیزی، گزارش اولویت و ابزار ممیزی فقط‌خواندنی بالا. قالب Beano Coffee دست‌نخورده است.

## تفاوت با بازنگری ۱ (اصلاح خطاهای ممیزی قبلی)
بازنگری ۱ بدون PHP نوشته شده بود. این بازنگری با PHP 8.3.6 و tokenizer انجام شد و چند ادعای قبلی را اصلاح می‌کند:

| موضوع | بازنگری ۱ | یافته واقعی |
|---|---|---|
| پرانتز نامتوازن در `site-manager-bridge.php` | «احتمالی، نامطمئن» | **هشدار کاذب.** `php -l` روی هر ۴ فایل PHP بدون خطا است. |
| `/maintenance`, `/security/audit`, `/security/login-log` | «فقط کلید» | **دارای capability:** `manage_options` از طریق `admin_only()` (pro.php خطوط ۶۶، ۹۹، ۱۹۱). |
| `/seo/suggest`, `/seo/advanced` | فقط کلید/نامشخص | **دارای capability:** `edit_post` برای همان مطلب (`can_edit`). |
| صف آفلاین در `localStorage` | «ذخیره در localStorage» | در حالت بومی Android در **Android Keystore (AES-GCM)** ذخیره می‌شود (`index.html:178-185`). فقط در پیش‌نمایش وب به `localStorage` می‌افتد. |
| بسته نصبی Bridge شامل تست | تست‌های PHP نام برده شد | **zip نصبی و zip فعلی Android هیچ تست PHP ندارند** (فقط `tests/audit-route-matrix.php` که همین مرحله افزوده شد). تست‌های قبلی Bridge (`action-scopes` و …) در ورودی‌های این جلسه وجود ندارند و اجرا یا تأیید نشدند. |
| `/dash` | «بدون capability» | درست است، و **تازه:** در allow-list کلید `read` است، پس کلید «فقط مشاهده غیرحساس» درآمد امروز/ماه و ۷ روز را می‌بیند. |

## محدودیت‌های این ممیزی
- **هیچ سایت وردپرس/ووکامرس زنده‌ای نبود.** پس هیچ endpoint واقعاً فراخوانی نشد؛ «پیاده‌سازی واقعی» یعنی کد از API رسمی WP/WC استفاده می‌کند، نه اینکه اجرای آن تأیید شده باشد.
- مجوز از فراخوانی مستقیم `current_user_can('…')` و دو تابع کمکی تشخیص داده می‌شود. «—» یعنی «در بدنه هندلر پیدا نشد»؛ کنترل غیرمستقیم (مثلاً در کلاس دیگر) را نمی‌بیند. ستون «در اپ» تطبیق رشته‌ای است.
- ساخت APK و نصب روی دستگاه انجام نشد. تست `editor-dom` به `jsdom` نیاز دارد که نصب نیست و نصب بسته در این محیط ممکن نیست.
- سازگاری با WordPress 7.1.4 و WooCommerce 11.2.2 بررسی **نشد**.

## معماری احراز هویت (تأییدشده در `SMB3::auth()`، خطوط ۱۱۹ به بعد)
کلید با SHA-256 ذخیره و با `hash_equals` مقایسه می‌شود؛ HTTPS الزامی؛ سقف ۱۲۰ درخواست در دقیقه به‌ازای IP+کلید؛ انقضا و ابطال کلید؛ فهرست IP مجاز با `REMOTE_ADDR` (بدون اعتماد به هدرهای forward)؛ محدوده مسیر هر کلید؛ محدودیت عملیاتی deny-only؛ سیاست حداقل نقش برای هر مسیر؛ نقش `read` و `editor` با allow-list regex محدود. کلید و IP در لاگ ثبت نمی‌شوند.
ضعف: لاگ فعالیت فقط نقش، متد و مسیر دارد؛ هویت کلید/کاربر و نتیجه عملیات را ثبت نمی‌کند.

## راهنمای ستون‌ها
وجود: ✅ دارد · 🟡 بخشی · ❌ ندارد. «مجوز سروری» از ماتریس پیوست. «تست»: فقط تست موجود و اجراشده در این جلسه.

## جدول ۲۷ بخش

| # | بخش | وجود | واقعی یا فقط UI | API | مجوز سروری | تست |
|---|---|---|---|---|---|---|
| ۱ | داشبورد | ✅ | واقعی (شمارش‌ها، فروش ۷ روز، وضعیت سفارش‌ها) | `/dash`, `/reports/series`, `/notify` | **ندارد** در هر سه؛ `/dash` برای کلید `read` هم باز است | ندارد |
| ۲ | کاربران و نقش‌ها | ✅ | واقعی | `/users`, `/users/{id}`, `/roles`, `/profile` | `/roles`, `/profile`: capability + confirm. **`/users*`: ندارد**، حذف بدون confirm سروری | ندارد |
| ۳ | نوشته‌ها و برگه‌ها | ✅ | واقعی (فهرست، ویرایش، نسخه‌ها، گروهی، سئو) | `/posts*`, `/revisions/{id}`, `/posts/bulk`, `/types`, `/seo/*` | دارد (`edit_post`, `publish_post`) | `editor-dom` اجرا نشد (jsdom) |
| ۴ | رسانه | ✅ | واقعی | `/media`, `/media/{id}` | دارد (`upload_files`, `delete_post`) + confirm | ندارد |
| ۵ | دیدگاه‌ها | ✅ | واقعی | `/comments`, `/comments/{id}` | دارد (`moderate_comments`, `edit_comment`) | ندارد |
| ۶ | دسته‌بندی و برچسب | 🟡 | واقعی ولی محدود: ساخت/تغییر نام/حذف؛ بدون والد، slug، توضیح | `/terms` | **ندارد**؛ حذف بدون confirm | ندارد |
| ۷ | منوها | 🟡 | واقعی (ساخت/تغییر/حذف، محل نمایش)؛ عمق ویرایش آیتم‌ها بررسی نشد | `/menus` | دارد (`edit_theme_options`) + confirm | ندارد |
| ۸ | ابزارک‌ها | 🟡 | **فقط خواندنی** | `/widgets` GET | دارد (`edit_theme_options`) | ندارد |
| ۹ | افزونه‌ها | ✅ | واقعی. نصب و جست‌وجو فقط Backend است و **در اپ فراخوانی نمی‌شود** | `/plugins`, `/plugins/toggle`, `/plugins/action`, `/plugins/install`, `/plugins/search` | **ندارد** (بدون `activate/install/delete/update_plugins` و `DISALLOW_FILE_MODS`) | ندارد |
| ۱۰ | قالب‌ها | ✅ | واقعی؛ نصب/جست‌وجو فقط Backend | `/themes`, `/themes/action`, `/themes/install`, `/themes/search` | **ندارد** (همان ضعف) | ندارد |
| ۱۱ | تنظیمات عمومی وردپرس | ✅ | واقعی | `/wp-settings`, `/permalinks`, `/privacy`, `/registered-settings`, `/options` | دارد، جز **`/options` که ندارد** (فقط deny-list نام) | `theme-schema-ui` (موفق، UI) |
| ۱۲ | Site Health | 🟡 | واقعی ولی سفارشی؛ از `WP_Site_Health` هسته استفاده نمی‌کند | `/site-health` | دارد (`manage_options`) | ندارد |
| ۱۳ | به‌روزرسانی‌ها | 🟡 | مشاهده + تنظیم خودکار + به‌روزرسانی افزونه/قالب. **اجرای به‌روزرسانی هسته در کد نیست** (جست‌وجوی `Core_Upgrader` تهی) | `/updates`, `/autoupdates`, `/plugins/action`, `/themes/action` | `/updates`, `/autoupdates`: دارد. اجرای افزونه/قالب: **ندارد** | ندارد |
| ۱۴ | ابزارهای وردپرس | ✅ | واقعی (پاک‌سازی transient، پیوندها، ایمیل آزمایشی، Cron، Export، جست‌وجو/جایگزینی، ریدایرکت، الگوها، تعمیر) | `/tools`, `/cron`, `/maintenance`, `/export`, `/search-replace`, `/redirects`, `/patterns` | بیشتر دارد؛ **`/tools` ندارد** | ندارد |
| ۱۵ | ووکامرس | ✅ | واقعی (سفارش، محصول، متغیر، CSV، مشتری، کوپن). درگاه‌ها/ایمیل‌ها فقط خواندنی | `/orders*`, `/products*`, `/customers*`, `/gateways`, `/emails` | سفارش/محصول: دارد. **`/customers`, `/gateways`, `/emails`: ندارد** | ندارد |
| ۱۶ | گزارش فروش | 🟡 | واقعی؛ سقف ۳۰۰۰ سفارش (`/reports`) و ۱۵۰۰ (`/dash`) در حافظه، پس در فروشگاه بزرگ بی‌صدا ناقص می‌شود | `/reports`, `/reports/series`, `/reports/top` | `/reports/top`: دارد. **`/reports`, `/reports/series`: ندارد** | ندارد |
| ۱۷ | مدیریت انبار | ✅ | واقعی | `/stock`, `/notify` | `/stock`: دارد. **`/notify`: ندارد** | ندارد |
| ۱۸ | کوپن‌ها | 🟡 | واقعی (`WC_Coupon`) ولی **باگ ایمنی:** حذف با `wp_delete_post($id,true)` بدون بررسی نوع پست و بدون confirm (`site-manager-bridge.php:1194`) | `/coupons`, `/coupons/{id}` | **ندارد** | ندارد |
| ۱۹ | مالیات | ❌ | هیچ پیاده‌سازی در Bridge و اپ | — | — | — |
| ۲۰ | حمل‌ونقل | ❌ | هیچ پیاده‌سازی | — | — | — |
| ۲۱ | بازپرداخت | 🟡 | واقعی (`wc_create_refund`) با کنترل مبلغ. بدون بازپرداخت سطری، گردش تأیید و محافظت تکرار | `/orders/{id}/refund` | دارد (`manage_woocommerce`) | ندارد |
| ۲۲ | تنظیمات قالب | 🟡 | Schema خواندنی؛ ذخیره از Settings API و Adapter Beano. Customizer/Redux/Kirki بدون نوشتن؛ ACF فقط خواندنی | `/theme/schema`, `/registered-settings`, `/beano/*` | دارد (`manage_options`) + confirm | `theme-schema-ui` موفق (UI) |
| ۲۳ | امنیت | ✅ | واقعی: چندکلید، نقش، IP، مسیر، انقضا، ابطال، rate limit، ممیزی امنیتی، لاگ ورود، Keystore. **ندارد:** 2FA، تأیید دو مرحله‌ای، Audit کامل | `/security/keys`, `/security/audit`, `/security/login-log`, `/api-control`, `/activity` | دارد (`manage_options`) | ندارد (در این بسته) |
| ۲۴ | بکاپ | ❌ | وجود ندارد؛ فقط undo محدود (قیمت گروهی، جایگزینی، اتوماسیون) | — | — | — |
| ۲۵ | مدیریت چندسایته | 🟡 | اپ: چند سایت، کلید جدا در Keystore، کش جدا. Bridge: فهرست/بایگانی زیرسایت‌های WP Multisite. **ندارد:** داشبورد تجمیعی، عملیات گروهی | `/network` (فقط Multisite) | دارد (`manage_sites`) + confirm | ندارد |
| ۲۶ | اتوماسیون | 🟡 | واقعی ولی محدود: Cron شبانه برای سئو با لاگ و undo؛ موتور عمومی قاعده/رویداد نیست | `/automation`, `/notify` | `/automation`: دارد. `/notify`: ندارد | ندارد |
| ۲۷ | دستیار هوشمند | ❌ | وجود ندارد | — | — | — |

## نتیجه تست‌ها (اجراشده در همین جلسه)
| تست | نتیجه |
|---|---|
| `php -l` روی ۴ فایل PHP افزونه + ابزار ممیزی | موفق، بدون خطا |
| Android `check-inline` | موفق (۱ بلوک) |
| Android `inline-handlers` | موفق (۲۱۳ تابع) |
| Android `theme-schema-ui` | موفق (۹ PASS، ۰ خطا) |
| Android `plus-logic` | موفق |
| Android `node --check` روی `editor.js`, `plus.js`, `native.js`, `pro.js` | موفق |
| Android `editor-dom` | **اجرا نشد** (`jsdom` نصب نیست) |
| تست PHP/عملکردی Bridge روی وردپرس | **اجرا نشد** (سایت/WordPress موجود نیست؛ تست‌ها در بسته نیستند) |
| ساخت APK، نصب روی دستگاه | **انجام نشد** |
| WordPress 7.1.4 / WooCommerce 11.2.2 | **بررسی نشد** |
هیچ تست عملکردی برای سفارش، محصول، بازپرداخت، کوپن، کاربر، نقش یا افزونه وجود ندارد.

## یافته‌های امنیتی و کیفیتی (با شاهد)
۱. **حذف دلخواه نوشته از مسیر کوپن** (`:1194`، `wp_delete_post($id, true)` بدون بررسی `shop_coupon`، capability یا confirm).
۲. **۲۸ مسیر بدون capability مستقیم** در هندلر؛ از آن میان ۵ مسیر حذف‌کننده: `/terms`, `/users/{id}`, `/coupons/{id}`, `/plugins/action`, `/themes/action`. تنها محافظ، دروازه `auth()` و نقش کلید است. فهرست کامل در پیوست.
۳. **نصب افزونه/قالب از URL** بدون `install_plugins`/`install_themes`/`DISALLOW_FILE_MODS` (ریسک زنجیره تأمین).
۴. **حذف کاربر/افزونه/ترم بدون confirm سروری**؛ تأیید فقط در UI اپ است.
۵. **SQL مستقیم** برخلاف قانون پروژه: `DELETE` خام روی `wp_options` در `/tools` (`:1324`)؛ `$wpdb->update` روی `wp_posts` در `/search-replace` (pro.php:314 و ۳۴۱). چند `SELECT` آماده‌شده (انبار، مشتری، گزینه‌ها) هم هست که با `prepare` امن‌اند اما قانون «بدون SQL مستقیم» را نقض می‌کنند.
۶. **کلید `read` درآمد را می‌بیند** (`/dash` در allow-list).
۷. **کش GET در `localStorage` بدون رمزنگاری** تا ۷ روز برای `ping, dash, types, sections, posts, products, media, admin-menu, admin-catalog, widgets` (`index.html:151-171`). کلید سایت و صف آفلاین در حالت بومی امن‌اند.
۸. **سازگاری ووکامرس:** اعلام HPOS (`declare_compatibility`) و هدرهای `Requires at least / Requires PHP / Requires Plugins` در افزونه **پیدا نشد** (هدر فایل اصلی ۷ خط و فاقد آن‌هاست).
۹. **گزارش‌ها بی‌صدا ناقص‌اند** در فروشگاه بزرگ (سقف سفارش).
۱۰. **لاگ فعالیت** هویت و نتیجه را ثبت نمی‌کند.
۱۱. **مقاومت ورودی:** در `users()` دسترسی مستقیم به `$b['login']`, `$b['pass']`, `$b['role']` بدون `isset`، که در PHP 8 هشدار «Undefined array key» می‌دهد.

## فاصله نسبت به الزامات پروژه
- بدون UI و Backend: مالیات، حمل‌ونقل، بکاپ، دستیار هوشمند.
- Backend بدون UI: نصب/جست‌وجوی افزونه و قالب (۴ مسیر).
- ناقص: ابزارک‌ها (فقط خواندنی)، به‌روزرسانی هسته، Site Health هسته‌ای، داشبورد چندفروشگاهی، اتوماسیون عمومی.

## پیوست: ماتریس مسیرها (تولیدشده با `tests/audit-route-matrix.php`)
بازتولید: `php tests/audit-route-matrix.php <پوشه-bridge> <پوشه-www-اپ>`

| مسیر | متدها | هندلر | مجوز سروری (از کد) | حذف | confirm | wpdb | در اپ |
|---|---|---|---|---|---|---|---|
| `/ping` | GET | ping | — |  |  |  | بله |
| `/dash` | GET | dash | — |  |  |  | بله |
| `/orders` | GET | orders | manage_woocommerce، edit_shop_orders |  |  |  | بله |
| `/orders/{id}` | GET,POST | order | manage_woocommerce، edit_shop_orders |  |  |  | بله |
| `/products` | GET | products | edit_products |  |  |  | بله |
| `/products/{id}` | GET,POST | product | edit_products، read_post، edit_post |  | بله |  | بله |
| `/plugins` | GET | plugins | — |  |  |  | بله |
| `/plugins/toggle` | POST | plugin_toggle | — |  |  |  | بله |
| `/groups` | GET | groups | — |  |  |  | بله |
| `/options` | GET,POST | options | — |  |  |  | بله |
| `/login-link` | POST | login_link | read |  |  |  | بله |
| `/types` | GET | types | — |  |  |  | بله |
| `/posts` | GET | posts | edit_others_posts، edit_posts |  |  |  | بله |
| `/posts/{id}` | GET,POST | post | read_post، edit_post |  | بله |  | بله |
| `/terms` | GET,POST | terms | — | بله |  |  | بله |
| `/comments` | GET | comments | moderate_comments |  |  |  | بله |
| `/comments/{id}` | POST | comment | edit_comment | بله |  |  | بله (الحاق رشته) |
| `/users` | GET,POST | users | — |  |  |  | بله |
| `/users/{id}` | POST | user | — | بله |  |  | بله (الحاق رشته) |
| `/media` | GET,POST | media | upload_files |  |  |  | بله |
| `/media/{id}` | GET,POST | media_del | read_post، edit_post، delete_post | بله | بله |  | بله (الحاق رشته) |
| `/coupons` | GET | coupons | — |  |  |  | بله |
| `/coupons/{id}` | POST | coupon | — | بله |  |  | بله (الحاق رشته) |
| `/customers` | GET | customers | — |  |  |  | بله |
| `/plugins/action` | POST | plugin_action | — | بله |  |  | بله |
| `/plugins/install` | POST | plugin_install | — |  |  |  | خیر |
| `/plugins/search` | GET | plugin_search | — |  |  |  | خیر |
| `/themes` | GET | themes | — |  |  |  | بله |
| `/themes/action` | POST | theme_action | — | بله |  |  | بله |
| `/themes/install` | POST | theme_install | — |  |  |  | خیر |
| `/themes/search` | GET | theme_search | — |  |  |  | خیر |
| `/gateways` | GET | gateways | — |  |  |  | بله |
| `/emails` | GET | emails | — |  |  |  | بله |
| `/reports` | GET | reports | — |  |  |  | بله |
| `/tools` | GET,POST | tools | — |  |  | بله | بله |
| `/sections` | GET | sections | — |  |  |  | بله |
| `/bulk` | POST | bulk | edit_post، delete_post، manage_woocommerce |  | بله |  | بله |
| `/admin-menu` | GET | admin_menu_data | read |  |  |  | بله |
| `/admin-catalog` | GET | admin_catalog | manage_options، edit_posts، edit_pages، upload_files، edit_theme_options، install_plugins، manage_woocommerce، moderate_comments، list_users، activate_plugins |  |  |  | بله |
| `/registered-settings` | GET,POST | registered_settings | manage_options |  | بله |  | بله |
| `/menus` | GET,POST | menus | edit_theme_options | بله | بله |  | بله |
| `/widgets` | GET | widgets | edit_theme_options |  |  |  | بله |
| `/api-control` | GET,POST | api_control | manage_options |  |  |  | بله |
| `/wp-settings` | GET,POST | wp_settings | manage_options |  |  |  | بله |
| `/revisions/{id}` | GET,POST | revisions | edit_post |  |  |  | بله (الحاق رشته) |
| `/products/{id}/variations` | GET,POST | variations | read_post، edit_post، manage_woocommerce |  |  |  | بله (الحاق رشته) |
| `/orders/create` | POST | order_create | manage_woocommerce، edit_shop_orders |  |  |  | بله |
| `/orders/{id}/refund` | POST | order_refund | manage_woocommerce |  |  |  | بله |
| `/customers/{id}` | GET | customer_detail | manage_woocommerce، list_users |  |  |  | بله (الحاق رشته) |
| `/products/csv` | GET,POST | products_csv | manage_woocommerce |  | بله |  | بله |
| `/security/keys` | GET,POST | security_keys | manage_options |  |  |  | بله |
| `/beano/sections` | GET | beano_sections | — |  |  |  | بله |
| `/theme/schema` | GET | theme_schema | manage_options |  |  |  | بله |
| `/beano/section/{key}` | GET,POST | beano_section | manage_options |  |  |  | بله (الحاق رشته) |
| `/activity` | GET | activity_list | manage_options |  |  |  | بله |
| `/updates` | GET | updates_data | update_core، update_plugins |  |  |  | بله |
| `/site-health` | GET | site_health | manage_options |  |  | بله | بله |
| `/bulk/price` | POST | bulk_price | manage_woocommerce |  | بله |  | بله |
| `/seo/suggest` | GET | seo_suggest | edit_post(can_edit) |  |  |  | بله |
| `/seo/advanced` | GET,POST | seo_advanced | edit_post(can_edit) |  |  |  | بله |
| `/automation` | GET,POST | automation | manage_options |  |  |  | بله |
| `/notify` | GET | notify | — |  |  | بله | بله |
| `/reports/series` | GET | report_series | — |  |  | بله | بله |
| `/profile` | GET,POST | profile | read، create_app_password، delete_app_password، edit_user |  | بله |  | بله |
| `/permalinks` | GET,POST | permalinks | manage_options |  | بله |  | بله |
| `/privacy` | GET,POST | privacy | manage_privacy_options، export_others_personal_data، erase_others_personal_data | بله | بله |  | بله |
| `/patterns` | GET,POST | patterns | edit_post، delete_post، unfiltered_html |  |  |  | بله |
| `/export` | GET | export | export |  |  |  | بله |
| `/cron` | GET,POST | cron | manage_options |  | بله |  | بله |
| `/roles` | GET,POST | roles | promote_users، list_users، manage_options |  | بله |  | بله |
| `/network` | GET,POST | network | manage_sites |  | بله |  | بله |
| `/maintenance` | GET,POST | maintenance | manage_options(admin_only) |  | بله |  | بله |
| `/security/audit` | GET,POST | audit | manage_options(admin_only) |  |  |  | بله |
| `/security/login-log` | GET,POST | login_log | manage_options(admin_only) |  | بله |  | بله |
| `/autoupdates` | GET,POST | autoupdates | update_plugins، update_core، update_themes |  | بله |  | بله |
| `/redirects` | GET,POST | redirects | manage_options |  | بله |  | بله |
| `/search-replace` | POST | search_replace | manage_options، edit_others_posts، edit_post |  | بله | بله | بله |
| `/posts/bulk` | POST | posts_bulk | publish_post | بله | بله |  | بله |
| `/orders/bulk` | POST | orders_bulk | edit_shop_orders، manage_woocommerce |  | بله |  | بله |
| `/reports/top` | GET | report_top | manage_woocommerce، view_woocommerce_reports |  |  |  | بله |
| `/stock` | GET,POST | stock | edit_products، manage_woocommerce، edit_post |  |  |  | بله |

جمع: 81 مسیر؛ بدون capability مستقیم: 28؛ حذف‌کننده بدون capability: 5؛ بدون فراخوانی در اپ: 4
