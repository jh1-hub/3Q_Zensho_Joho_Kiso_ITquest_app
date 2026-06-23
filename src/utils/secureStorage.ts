/**
 * Simple Obfuscation Secure Storage Wrapper with V2 Robust UTF-8 Encoding
 */

function encode(str: string): string {
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    // XOR obfuscate with key 83
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= 83;
    }
    // Convert to hex
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return 'v2:' + hex;
  } catch (e) {
    console.error('secureStorage encode error:', e);
    return str; // Fallback to raw if anything fails
  }
}

function decode(obfuscated: string): string {
  if (!obfuscated) return '';

  // If it's the new format
  if (obfuscated.startsWith('v2:')) {
    try {
      const hex = obfuscated.substring(3);
      if (hex.length % 2 !== 0) return '';
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      // XOR de-obfuscate
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] ^= 83;
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (e) {
      console.error('secureStorage decode v2 error:', e);
      return '';
    }
  }

  // Fallback to decode the legacy format
  try {
    const rawB64 = atob(obfuscated);
    const chars = decodeURIComponent(escape(rawB64));
    const decoded = chars.split('').map(c => {
      const code = c.charCodeAt(0);
      return String.fromCharCode(code ^ 83);
    }).join('');
    return decoded;
  } catch (e) {
    // If it's not base64 or failed to decode, returning empty will trigger fallback to raw string
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
