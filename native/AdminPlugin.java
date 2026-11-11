package ir.sitemanager.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.os.Build;
import android.os.SystemClock;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.UserNotAuthenticatedException;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "Admin")
public class AdminPlugin extends Plugin {
    private static final String STORE = "smb_secure_store";
    // v1: کلید قدیمی (بدون الزام احراز هویت). v2: کلید وابسته به قفل دستگاه (در سخت‌افزار اعمال می‌شود).
    private static final String KEY_ALIAS_V1 = "site-manager-aes-v1";
    private static final String KEY_ALIAS = "site-manager-aes-v2";
    private static final String V2 = "v2:";
    private static final int AUTH_WINDOW_SEC = 300;
    private static final int GCM_TAG_BITS = 128;
    private volatile long unlockedUntilElapsed = 0L;
    private static final long UNLOCK_WINDOW_MS = 5L * 60L * 1000L;

    @Override
    protected void handleOnPause() { unlockedUntilElapsed = 0L; }

    private boolean requireUnlocked(PluginCall call) {
        KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        boolean deviceLocked = km == null || km.isDeviceLocked();
        if (!deviceLocked && SystemClock.elapsedRealtime() <= unlockedUntilElapsed) return true;
        unlockedUntilElapsed = 0L;
        call.reject("برای دسترسی به اطلاعات امن، قفل دستگاه را دوباره باز کنید");
        return false;
    }

    @PluginMethod
    public void getShared(PluginCall call) {
        JSObject o = new JSObject();
        o.put("text", MainActivity.sharedText == null ? "" : MainActivity.sharedText);
        o.put("subject", MainActivity.sharedSubject == null ? "" : MainActivity.sharedSubject);
        MainActivity.sharedText = null;
        MainActivity.sharedSubject = null;
        call.resolve(o);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String start = call.getString("start", "");
        String base = call.getString("base", "");
        boolean baseHttps = base != null && base.startsWith("https://");
        boolean baseHttp = base != null && base.startsWith("http://");
        if (start == null || base == null || !(baseHttps || baseHttp) || !start.startsWith(baseHttps ? "https://" : "http://")) {
            call.reject("آدرس باید http:// یا https:// باشد و نشانی شروع هم‌پروتکل با آدرس سایت باشد");
            return;
        }
        if (hasUserInfo(base) || hasUserInfo(start)) { call.reject("نشانی نباید شامل نام‌کاربری یا گذرواژه باشد"); return; }
        String loginUrl0 = call.getString("loginUrl", "");
        if (loginUrl0 != null && !loginUrl0.isEmpty() && (!sameOrigin(base, loginUrl0) || !loginUrl0.startsWith("https://") || hasUserInfo(loginUrl0))) {
            call.reject("نشانی ورود باید https و هم‌مبدأ با سایت باشد");
            return;
        }
        String path0 = call.getString("path", "");
        if (path0 != null && (path0.contains("://") || path0.startsWith("//") || path0.contains("\\") || path0.length() > 500)) {
            call.reject("مسیر نامعتبر است");
            return;
        }
        int defaultPort = baseHttps ? 443 : 80;
        android.net.Uri baseUri = android.net.Uri.parse(base);
        android.net.Uri startUri = android.net.Uri.parse(start);
        int basePort = baseUri.getPort() < 0 ? defaultPort : baseUri.getPort();
        int startPort = startUri.getPort() < 0 ? defaultPort : startUri.getPort();
        if (baseUri.getHost() == null || startUri.getHost() == null || !baseUri.getHost().equalsIgnoreCase(startUri.getHost()) || basePort != startPort) {
            call.reject("نشانی پیشخوان باید با دامنه اتصال یکسان باشد");
            return;
        }
        Intent i = new Intent(getContext(), AdminActivity.class);
        i.putExtra("base", call.getString("base", ""));
        i.putExtra("user", call.getString("user", ""));
        i.putExtra("pass", call.getString("pass", ""));
        i.putExtra("start", start);
        i.putExtra("path", call.getString("path", ""));
        i.putExtra("loginUrl", call.getString("loginUrl", ""));
        i.putExtra("clean", call.getBoolean("clean", false));
        i.putExtra("ttl", call.getString("ttl", ""));
        getActivity().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void saveSecret(PluginCall call) {
        if (!requireUnlocked(call)) return;
        String alias = safeAlias(call.getString("alias", ""));
        String value = call.getString("value", null);
        if (alias == null || value == null) { call.reject("اطلاعات ذخیره‌سازی معتبر نیست"); return; }
        try {
            putEncrypted(alias, value);
            JSObject out = new JSObject(); out.put("ok", true); call.resolve(out);
        } catch (UserNotAuthenticatedException e) {
            unlockedUntilElapsed = 0L; call.reject("زمان تأیید هویت تمام شد؛ قفل دستگاه را دوباره تأیید کنید");
        } catch (KeyPermanentlyInvalidatedException e) {
            resetKeys(); call.reject("کلید امن به‌دلیل تغییر قفل دستگاه نامعتبر شد؛ اطلاعات سایت را دوباره وارد کنید");
        } catch (Exception e) { call.reject("ذخیره امن انجام نشد"); }
    }

    @PluginMethod
    public void getSecret(PluginCall call) {
        if (!requireUnlocked(call)) return;
        String alias = safeAlias(call.getString("alias", ""));
        if (alias == null) { call.reject("شناسه ذخیره‌سازی معتبر نیست"); return; }
        try {
            SharedPreferences sp = getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
            String encoded = sp.getString(alias, null);
            JSObject out = new JSObject();
            if (encoded == null) { out.put("exists", false); call.resolve(out); return; }
            String value;
            if (encoded.startsWith(V2)) {
                value = decrypt(encoded.substring(V2.length()), getSecretKey(), alias);
            } else {
                // مهاجرت از قالب قدیمی v1: خواندن با کلید قدیمی، سپس ذخیرهٔ دوباره با کلید وابسته به قفل دستگاه.
                value = decrypt(encoded, getLegacyKey(), null);
                try { putEncrypted(alias, value); purgeLegacyKeyIfUnused(); } catch (Exception ignored) {}
            }
            out.put("exists", true); out.put("value", value); call.resolve(out);
        } catch (UserNotAuthenticatedException e) {
            unlockedUntilElapsed = 0L; call.reject("زمان تأیید هویت تمام شد؛ قفل دستگاه را دوباره تأیید کنید");
        } catch (KeyPermanentlyInvalidatedException e) {
            resetKeys(); call.reject("کلید امن به‌دلیل تغییر قفل دستگاه نامعتبر شد؛ اطلاعات سایت را دوباره وارد کنید");
        } catch (Exception e) { call.reject("خواندن امن انجام نشد؛ قفل دستگاه را باز کنید"); }
    }

    private void putEncrypted(String alias, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getSecretKey());
        cipher.updateAAD(alias.getBytes(StandardCharsets.UTF_8)); // اتصال متن رمزشده به شناسه؛ جابه‌جایی بین aliasها شناسایی می‌شود
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        byte[] packed = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, packed, 0, iv.length);
        System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
        getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE)
            .edit().putString(alias, V2 + Base64.encodeToString(packed, Base64.NO_WRAP)).apply();
    }

    private String decrypt(String b64, SecretKey key, String aad) throws Exception {
        byte[] packed = Base64.decode(b64, Base64.NO_WRAP);
        if (packed.length <= 12 + 16) throw new IllegalArgumentException("invalid");
        byte[] iv = new byte[12], data = new byte[packed.length - 12];
        System.arraycopy(packed, 0, iv, 0, 12);
        System.arraycopy(packed, 12, data, 0, data.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
        if (aad != null) cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return new String(cipher.doFinal(data), StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void deleteSecret(PluginCall call) {
        if (!requireUnlocked(call)) return;
        String alias = safeAlias(call.getString("alias", ""));
        if (alias == null) { call.reject("شناسه ذخیره‌سازی معتبر نیست"); return; }
        getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().remove(alias).apply();
        JSObject out = new JSObject(); out.put("ok", true); call.resolve(out);
    }

    @PluginMethod
    public void isUnlocked(PluginCall call) {
        JSObject out = new JSObject();
        boolean active = SystemClock.elapsedRealtime() <= unlockedUntilElapsed;
        KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (km != null && !km.isDeviceLocked()) {
            out.put("unlocked", active);
        } else {
            unlockedUntilElapsed = 0L;
            out.put("unlocked", false);
        }
        call.resolve(out);
    }

    @PluginMethod
    public void lock(PluginCall call) {
        unlockedUntilElapsed = 0L;
        JSObject out = new JSObject(); out.put("ok", true); call.resolve(out);
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (km == null || !km.isDeviceSecure()) {
            unlockedUntilElapsed = 0L;
            call.reject("برای امنیت، ابتدا قفل صفحه دستگاه را با PIN، الگو یا گذرواژه فعال کنید");
            return;
        }
        Intent intent = km.createConfirmDeviceCredentialIntent("بازکردن Site Manager", "برای دسترسی به کلیدهای ذخیره‌شده، هویت خود را تأیید کنید");
        if (intent == null) { call.reject("تأیید هویت دستگاه در دسترس نیست"); return; }
        startActivityForResult(call, intent, "unlockResult");
    }

    @ActivityCallback
    private void unlockResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK) {
            unlockedUntilElapsed = SystemClock.elapsedRealtime() + UNLOCK_WINDOW_MS;
            JSObject out = new JSObject(); out.put("ok", true); call.resolve(out);
        } else call.reject("تأیید هویت لغو شد");
    }

    private SecretKey getSecretKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEY_ALIAS)) return (SecretKey) ks.getKey(KEY_ALIAS, null);
        if (Build.VERSION.SDK_INT >= 28) {
            try { return generateKey(true); } catch (Exception strongBoxUnavailable) { /* StrongBox همه‌جا نیست؛ به TEE برمی‌گردیم */ }
        }
        return generateKey(false);
    }

    private SecretKey generateKey(boolean strongBox) throws Exception {
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .setUserAuthenticationRequired(true); // استفادهٔ کلید فقط پس از تأیید قفل دستگاه، در سخت‌افزار اعمال می‌شود
        if (Build.VERSION.SDK_INT >= 30) b.setUserAuthenticationParameters(AUTH_WINDOW_SEC, KeyProperties.AUTH_DEVICE_CREDENTIAL);
        else b.setUserAuthenticationValidityDurationSeconds(AUTH_WINDOW_SEC);
        if (strongBox && Build.VERSION.SDK_INT >= 28) b.setIsStrongBoxBacked(true);
        generator.init(b.build());
        return generator.generateKey();
    }

    private SecretKey getLegacyKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(KEY_ALIAS_V1)) throw new IllegalStateException("legacy key missing");
        return (SecretKey) ks.getKey(KEY_ALIAS_V1, null);
    }

    /** وقتی هیچ مقدار قدیمی (بدون پیشوند v2:) نمانده، کلید v1 پاک می‌شود. */
    private void purgeLegacyKeyIfUnused() {
        try {
            for (Object v : getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE).getAll().values())
                if (!(v instanceof String) || !((String) v).startsWith(V2)) return;
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
            if (ks.containsAlias(KEY_ALIAS_V1)) ks.deleteEntry(KEY_ALIAS_V1);
        } catch (Exception ignored) {}
    }

    /** پس از نامعتبرشدن کلید (مثلاً حذف قفل صفحه): کلید و دادهٔ غیرقابل‌خواندن پاک می‌شود تا برنامه گیر نکند. */
    private void resetKeys() {
        unlockedUntilElapsed = 0L;
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
            if (ks.containsAlias(KEY_ALIAS)) ks.deleteEntry(KEY_ALIAS);
        } catch (Exception ignored) {}
        getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().clear().apply();
    }

    private static boolean hasUserInfo(String url) {
        try { return android.net.Uri.parse(url).getUserInfo() != null; } catch (Exception e) { return true; }
    }

    private static boolean sameOrigin(String a, String b) {
        try {
            android.net.Uri x = android.net.Uri.parse(a), y = android.net.Uri.parse(b);
            if (x.getScheme() == null || y.getScheme() == null || x.getHost() == null || y.getHost() == null) return false;
            int dx = "https".equalsIgnoreCase(x.getScheme()) ? 443 : 80, dy = "https".equalsIgnoreCase(y.getScheme()) ? 443 : 80;
            return x.getScheme().equalsIgnoreCase(y.getScheme()) && x.getHost().equalsIgnoreCase(y.getHost())
                && (x.getPort() < 0 ? dx : x.getPort()) == (y.getPort() < 0 ? dy : y.getPort());
        } catch (Exception e) { return false; }
    }

    private String safeAlias(String value) {
        if (value == null || !value.matches("[A-Za-z0-9_.-]{1,120}")) return null;
        return value;
    }
}
