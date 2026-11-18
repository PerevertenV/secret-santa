// Спільний модуль: працює і в браузері, і в Node 18+ (WebCrypto).
// Результат жеребкування шифрується ключем з "логін:пароль" (PBKDF2 -> AES-GCM).
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITER = 150000;

const toB64 = (u8) => btoa(String.fromCharCode(...u8));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const normLogin = (s) => String(s).trim().toLowerCase();

async function deriveKey(login, password, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(normLogin(login) + ":" + password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function seal(login, password, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(login, password, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)))
  );
  return { login: normLogin(login), salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

// Повертає payload або null, якщо пароль невірний.
export async function open(login, password, rec) {
  try {
    const key = await deriveKey(login, password, fromB64(rec.salt));
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(rec.iv) }, key, fromB64(rec.ct));
    return JSON.parse(dec.decode(buf));
  } catch {
    return null;
  }
}
