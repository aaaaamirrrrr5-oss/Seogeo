package ir.sitemanager.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.ArrayList;

/** Full wp-admin inside the app: every plugin/theme screen works, no server-side plugin needed. */
public class AdminActivity extends Activity {
    WebView wv; ProgressBar bar; TextView title;
    String base, user, pass, path, loginUrl;
    long lastLogin = 0;
    boolean clean; String ttl;
    ValueCallback<Uri[]> chooser;

    static final String CLEAN_JS = "(function(){if(document.getElementById('smb-clean'))return;var s=document.createElement('style');s.id='smb-clean';s.textContent='#adminmenumain,#wpadminbar,#wpfooter,.bh-nav,#screen-meta-links{display:none!important}html.wp-toolbar{padding-top:0!important}#wpcontent{margin:0!important;padding:0 10px!important}.wrap{margin:8px 0!important}body{background:#f5f0e8!important}.bh-card,.postbox,.card{border-radius:14px!important}input[type=text],input[type=number],input[type=url],input[type=email],input[type=password],select,textarea{max-width:100%!important}.form-table th,.form-table td{display:block;width:auto!important;padding:6px 0!important}table.widefat{display:block;overflow-x:auto}';document.head.appendChild(s)})()";

    static final String MENU_JS = "(function(){var o=[];document.querySelectorAll('#adminmenu > li').forEach(function(li){"
        + "var a=li.querySelector(':scope > a');if(!a||!a.getAttribute('href')||li.classList.contains('wp-menu-separator'))return;"
        + "var n=a.querySelector('.wp-menu-name')||a;o.push({t:n.textContent.replace(/\\s+/g,' ').trim(),h:a.href,s:0});"
        + "li.querySelectorAll('.wp-submenu li:not(.wp-submenu-head) a').forEach(function(s){o.push({t:s.textContent.replace(/\\s+/g,' ').trim(),h:s.href,s:1})})});"
        + "return JSON.stringify(o)})()";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        // پیشخوان وردپرس و ورود خودکار نباید در اسکرین‌شات/نمای برنامه‌های اخیر دیده شوند.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        Intent in = getIntent();
        base = in.getStringExtra("base") == null ? "" : in.getStringExtra("base").replaceAll("/+$", "");
        user = in.getStringExtra("user"); pass = in.getStringExtra("pass");
        path = in.getStringExtra("path"); loginUrl = in.getStringExtra("loginUrl");
        clean = in.getBooleanExtra("clean", false); ttl = in.getStringExtra("ttl");
        getWindow().getDecorView().setFilterTouchesWhenObscured(true); // tapjacking
        // The credentials were copied into fields; do not keep them in the activity's Intent (task snapshots, restored state).
        in.removeExtra("pass"); in.removeExtra("user");

        float d = getResources().getDisplayMetrics().density;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#1d2327"));
        root.setOnApplyWindowInsetsListener((v, w) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets s = w.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(s.left, s.top, s.right, s.bottom);
            } else {
                v.setPadding(w.getSystemWindowInsetLeft(), w.getSystemWindowInsetTop(), w.getSystemWindowInsetRight(), w.getSystemWindowInsetBottom());
            }
            return w;
        });

        LinearLayout tb = new LinearLayout(this);
        tb.setOrientation(LinearLayout.HORIZONTAL);
        tb.setGravity(Gravity.CENTER_VERTICAL);
        tb.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        tb.addView(btn("✕", "بستن", d, v -> finish()));
        tb.addView(btn("☰", "منوی سایت", d, v -> showMenu()));
        title = new TextView(this);
        title.setContentDescription("عنوان صفحه");
        title.setTextColor(Color.WHITE); title.setTextSize(14); title.setSingleLine(true);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        tb.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        tb.addView(btn("◀", "بازگشت", d, v -> { if (wv.canGoBack()) wv.goBack(); }));
        tb.addView(btn("⟳", "بارگذاری مجدد", d, v -> wv.reload()));
        root.addView(tb, new LinearLayout.LayoutParams(-1, (int) (48 * d)));

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setContentDescription("در حال بارگذاری صفحه");
        root.addView(bar, new LinearLayout.LayoutParams(-1, (int) (3 * d)));

        wv = new WebView(this);
        root.addView(wv, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        setup();

        if (base == null || !base.matches("^https?://[^/]+(?:/.*)?$")) {
            Toast.makeText(this, "آدرس سایت باید با http:// یا https:// شروع شود", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        String target = base + "/wp-admin/" + (path == null ? "" : path);
        String first = target;
        if (loginUrl != null && !loginUrl.isEmpty() && isTrusted(Uri.parse(loginUrl)) && loginUrl.startsWith("https://"))
            first = loginUrl + (loginUrl.contains("?") ? "&" : "?") + "redirect_to=" + Uri.encode(target);
        String start = in.getStringExtra("start");
        String dest = start != null && !start.isEmpty() ? start : first;
        if (!isTrusted(Uri.parse(dest))) { finish(); return; }
        wv.loadUrl(dest);
    }

    TextView btn(String t, String desc, float d, View.OnClickListener l) {
        TextView v = new TextView(this);
        v.setContentDescription(desc);
        v.setText(t); v.setTextColor(Color.WHITE); v.setTextSize(20); v.setGravity(Gravity.CENTER);
        v.setMinWidth((int) (48 * d)); v.setMinHeight((int) (48 * d));
        v.setOnClickListener(l);
        return v;
    }

    void setup() {
        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true); s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setGeolocationEnabled(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setSaveFormData(false);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString().replace("; wv", ""));
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true); cm.setAcceptThirdPartyCookies(wv, false);

        wv.setDownloadListener((url, ua, cd, mime, len) -> {
            Uri du = Uri.parse(url);
            // فقط https (یا http هم‌میزبان سایتِ انتخاب‌شده)؛ blob:/data:/file:/content: هرگز به برنامهٔ دیگر داده نمی‌شود.
            if (!isTrusted(du) && !"https".equalsIgnoreCase(du.getScheme())) return;
            try {
                Intent di = new Intent(Intent.ACTION_VIEW, du);
                di.addCategory(Intent.CATEGORY_BROWSABLE);
                startActivity(di);
            } catch (Exception ignored) {}
        });
        wv.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.startsWith("https://")) {
                    if (isTrusted(r.getUrl())) return false;
                    // دامنهٔ بیرونی داخل پیشخوان (با نوار ابزار و FLAG_SECURE) باز نمی‌شود تا صفحهٔ فیشینگ قابل‌اعتماد به‌نظر نرسد.
                    try { Intent ei = new Intent(Intent.ACTION_VIEW, r.getUrl()); ei.addCategory(Intent.CATEGORY_BROWSABLE); startActivity(ei); } catch (Exception ignored) {}
                    return true;
                }
                if (u.startsWith("http://")) {
                    // HTTP فقط برای خودِ سایتی که کاربر آگاهانه با http:// اضافه کرده مجاز است؛ هر دامنهٔ دیگر مسدود می‌ماند.
                    if (base != null && base.startsWith("http://") && r.getUrl().getHost() != null
                        && r.getUrl().getHost().equalsIgnoreCase(Uri.parse(base).getHost())) return false;
                    Toast.makeText(AdminActivity.this, "نشانی ناامن HTTP مسدود شد", Toast.LENGTH_SHORT).show();
                    return true;
                }
                // Only hand well-known, harmless schemes to other apps; never file:, content:, intent: or custom schemes.
                String scheme = r.getUrl().getScheme() == null ? "" : r.getUrl().getScheme().toLowerCase();
                if (scheme.equals("mailto") || scheme.equals("tel") || scheme.equals("sms") || scheme.equals("geo")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) {}
                }
                return true;
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler h, android.net.http.SslError e) {
                h.cancel(); // هرگز ادامه‌دادن با گواهی نامعتبر
                Toast.makeText(AdminActivity.this, "گواهی امنیتی سایت نامعتبر است؛ اتصال قطع شد", Toast.LENGTH_LONG).show();
            }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                finish(); // خرابی/kill فرایند رندر: بستن امن به‌جای کرش یا ادامه با WebView ناسالم
                return true;
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    bar.setVisibility(View.GONE);
                    Toast.makeText(AdminActivity.this, "بارگذاری صفحه انجام نشد؛ اتصال اینترنت را بررسی و دوباره تلاش کنید (⟳)", Toast.LENGTH_LONG).show();
                }
            }
            @Override public void onPageStarted(WebView v, String u, Bitmap f) { bar.setVisibility(View.VISIBLE); }
            @Override public void onPageCommitVisible(WebView v, String u) { applyClean(v, u); }
            @Override public void onPageFinished(WebView v, String u) {
                bar.setVisibility(View.GONE);
                applyClean(v, u);
                String tt = (ttl != null && !ttl.isEmpty() && u != null && u.contains("page=beano-settings")) ? ttl : v.getTitle();
                title.setText(tt == null ? "" : tt);
                autoLogin();
            }
        });
        wv.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v, int p) { bar.setProgress(p); }
            @Override public boolean onJsAlert(WebView v, String u, String m, JsResult r) {
                new AlertDialog.Builder(AdminActivity.this).setMessage(m)
                    .setPositiveButton("باشه", (x, y) -> r.confirm()).setOnCancelListener(x -> r.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView v, String u, String m, JsResult r) {
                new AlertDialog.Builder(AdminActivity.this).setMessage(m)
                    .setPositiveButton("تأیید", (x, y) -> r.confirm()).setNegativeButton("انصراف", (x, y) -> r.cancel())
                    .setOnCancelListener(x -> r.cancel()).show();
                return true;
            }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(Intent.createChooser(i, "انتخاب فایل"), 7); }
                catch (Exception e) { chooser = null; return false; }
                return true;
            }
        });
    }

    void applyClean(WebView v, String u) {
        if (clean && u != null && u.contains("page=beano-settings")) v.evaluateJavascript(CLEAN_JS, null);
    }

    void autoLogin() {
        if (user == null || user.isEmpty() || System.currentTimeMillis() - lastLogin < 20000) return;
        // Never inject credentials anywhere except the site's own https wp-login.php.
        try {
            Uri cu = Uri.parse(wv.getUrl() == null ? "" : wv.getUrl()), bu = Uri.parse(base);
            if (!"https".equalsIgnoreCase(cu.getScheme()) || cu.getHost() == null || bu.getHost() == null
                || !cu.getHost().equalsIgnoreCase(bu.getHost()) || cu.getPath() == null || !cu.getPath().endsWith("/wp-login.php")) return;
        } catch (Exception e) { return; }
        String js = "(function(){var f=document.getElementById('loginform'),u=document.getElementById('user_login'),p=document.getElementById('user_pass');"
            + "if(!f||!u||!p||document.getElementById('login_error'))return 0;u.value=" + JSONObject.quote(user)
            + ";p.value=" + JSONObject.quote(pass) + ";var r=document.getElementById('rememberme');if(r)r.checked=true;f.submit();return 1})()";
        wv.evaluateJavascript(js, v -> { if ("1".equals(v)) lastLogin = System.currentTimeMillis(); });
    }

    void showMenu() {
        wv.evaluateJavascript(MENU_JS, v -> {
            try {
                Object o = new JSONTokener(v).nextValue();
                JSONArray a = new JSONArray(o instanceof String ? (String) o : "[]");
                if (a.length() == 0) { Toast.makeText(this, "ابتدا وارد پیشخوان وردپرس شوید", Toast.LENGTH_SHORT).show(); return; }
                ArrayList<String> names = new ArrayList<>(), urls = new ArrayList<>();
                for (int i = 0; i < a.length(); i++) {
                    JSONObject m = a.getJSONObject(i);
                    names.add((m.getInt("s") == 1 ? "      • " : "") + m.getString("t"));
                    urls.add(m.getString("h"));
                }
                new AlertDialog.Builder(this).setTitle("منوی سایت (همهٔ افزونه‌ها)")
                    .setItems(names.toArray(new String[0]), (d, i) -> {
                        Uri mu = Uri.parse(urls.get(i));
                        if (isTrusted(mu)) wv.loadUrl(mu.toString()); else Toast.makeText(this, "نشانی منو مجاز نیست", Toast.LENGTH_SHORT).show();
                    }).show();
            } catch (Exception e) { Toast.makeText(this, "منو خوانده نشد", Toast.LENGTH_SHORT).show(); }
        });
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        if (req == 7 && chooser != null) {
            chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            chooser = null;
        } else super.onActivityResult(req, res, data);
    }

    /** https هم‌مبدأ با سایت؛ یا http هم‌مبدأ فقط وقتی کاربر خودش سایت را با http:// افزوده است. */
    boolean isTrusted(Uri u) {
        try {
            Uri b = Uri.parse(base);
            if (u == null || u.getHost() == null || b.getHost() == null || u.getUserInfo() != null) return false;
            String us = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
            boolean httpsBase = "https".equalsIgnoreCase(b.getScheme());
            if (!(us.equals("https") || (us.equals("http") && !httpsBase))) return false;
            if (httpsBase && !us.equals("https")) return false;
            int dp = us.equals("https") ? 443 : 80;
            int bp = b.getPort() < 0 ? (httpsBase ? 443 : 80) : b.getPort();
            return u.getHost().equalsIgnoreCase(b.getHost()) && (u.getPort() < 0 ? dp : u.getPort()) == bp;
        } catch (Exception e) { return false; }
    }

    @Override public void onBackPressed() { if (wv.canGoBack()) wv.goBack(); else finish(); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() {
        user = null; pass = null; // حذف مرجع اطلاعات ورود
        if (isFinishing()) {
            // نشست وردپرس و داده‌های وب پس از بستن پیشخوان پاک می‌شوند؛ هر بار با پیوند ورود یک‌بارمصرف دوباره وارد می‌شویم.
            try {
                CookieManager.getInstance().removeAllCookies(null); CookieManager.getInstance().flush();
                WebStorage.getInstance().deleteAllData();
                if (wv != null) { wv.clearCache(true); wv.clearHistory(); wv.clearFormData(); }
            } catch (Exception ignored) {}
        }
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        if (wv != null) { ViewGroup parent = (ViewGroup) wv.getParent(); if (parent != null) parent.removeView(wv); wv.stopLoading(); wv.destroy(); wv = null; }
        super.onDestroy();
    }
}
