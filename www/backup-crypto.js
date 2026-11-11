/* Site Manager encrypted backup envelope. No credentials are ever written in plaintext. */
(function (root) {
  'use strict';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const ITERATIONS = 310000;
  const toB64 = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  const fromB64 = (value) => {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  };
  async function derive(passphrase, salt) {
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(payload, passphrase) {
    if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('گذرواژه پشتیبان باید حداقل ۱۲ نویسه باشد');
    if (!root.crypto?.subtle) throw new Error('رمزنگاری امن این دستگاه در دسترس نیست');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await derive(passphrase, salt);
    const plain = encoder.encode(JSON.stringify(payload));
    if (plain.length > 8 * 1024 * 1024) throw new Error('حجم اطلاعات پشتیبان از سقف ۸ مگابایت بیشتر است');
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plain);
    return { format: 'smb-encrypted-backup', version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(new Uint8Array(cipher)) };
  }
  async function decrypt(envelope, passphrase) {
    if (!root.crypto?.subtle) throw new Error('رمزنگاری امن این دستگاه در دسترس نیست');
    if (!envelope || envelope.format !== 'smb-encrypted-backup' || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.cipher !== 'AES-256-GCM' || envelope.iterations !== ITERATIONS) throw new Error('ساختار فایل پشتیبان پشتیبانی نمی‌شود');
    const salt = fromB64(envelope.salt), iv = fromB64(envelope.iv), ciphertext = fromB64(envelope.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17 || ciphertext.length > 8 * 1024 * 1024) throw new Error('اندازه یا ساختار فایل پشتیبان معتبر نیست');
    const key = await derive(passphrase, salt);
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ciphertext);
      return JSON.parse(decoder.decode(plain));
    } catch (_) { throw new Error('گذرواژه اشتباه است یا فایل پشتیبان دستکاری شده است'); }
  }
  root.SMB_BACKUP_CRYPTO = Object.freeze({ encrypt, decrypt, iterations: ITERATIONS });
})(typeof window !== 'undefined' ? window : globalThis);
