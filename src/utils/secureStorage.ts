/**
 * Simple Obfuscation Secure Storage Wrapper
 */

function encode(str: string): string {
  const chars = str.split('').map(c => {
    const code = c.charCodeAt(0);
    return String.fromCharCode(code ^ 83); // XOR with 83
  }).join('');
  return btoa(unescape(encodeURIComponent(chars)));
}

function decode(obfuscated: string): string {
  try {
    const rawB64 = atob(obfuscated);
    const chars = decodeURIComponent(escape(rawB64));
    return chars.split('').map(c => {
      const code = c.charCodeAt(0);
      return String.fromCharCode(code ^ 83);
    }).join('');
  } catch (e) {
    return '';
  }
}

export const secureStorage = {
  setItem(key: string, value: string): void {
    try {
      const encryptedValue = encode(value);
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error('secureStorage setItem error:', e);
      localStorage.setItem(key, value);
    }
  },

  getItem(key: string): string | null {
    try {
      const val = localStorage.getItem(key);
      if (!val) return null;
      const decrypted = decode(val);
      if (decrypted) {
        // Double check if decryption looks plausible (e.g., if we stored json, it should match, or if it is simple string)
        return decrypted;
      }
      return val; // Fallback to plain text if decryption fails
    } catch (e) {
      console.error('secureStorage getItem error:', e);
      return localStorage.getItem(key);
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  }
};
