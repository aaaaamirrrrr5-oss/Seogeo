package ir.sitemanager.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Text/link shared from other apps (Share -> Site Manager). Consumed once by AdminPlugin.getShared().
    static volatile String sharedText = null;
    static volatile String sharedSubject = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdminPlugin.class);
        super.onCreate(savedInstanceState);
        // کلیدها، سفارش‌ها و مشتریان نباید در اسکرین‌شات، ضبط صفحه یا پیش‌نمایش برنامه‌های اخیر دیده شوند.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        // جلوگیری از tapjacking: لمس وقتی پنجرهٔ دیگری روی برنامه است نادیده گرفته می‌شود.
        getWindow().getDecorView().setFilterTouchesWhenObscured(true);
        readShare(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readShare(intent);
    }

    private void readShare(Intent i) {
        if (i == null || !Intent.ACTION_SEND.equals(i.getAction())) return;
        String t = i.getStringExtra(Intent.EXTRA_TEXT);
        String s = i.getStringExtra(Intent.EXTRA_SUBJECT);
        if (t != null && t.length() > 20000) t = t.substring(0, 20000);
        if (s != null && s.length() > 500) s = s.substring(0, 500);
        sharedText = t;
        sharedSubject = s;
    }
}
