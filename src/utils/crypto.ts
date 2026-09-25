/**
 * Web Crypto API utilities for Passcode verification and AES-GCM End-to-End Encryption
 */

// Helper to convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a random salt for hashing or key derivation
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return bufferToBase64(array.buffer);
}

/**
 * Hash a passcode with salt using SHA-256
 */
export async function hashPasscode(passcode: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + ':' + passcode);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToBase64(hashBuffer);
}

/**
 * Verify passcode against saved hash and salt
 */
export async function verifyPasscode(enteredPasscode: string, savedHash: string, salt: string): Promise<boolean> {
  const computedHash = await hashPasscode(enteredPasscode, salt);
  return computedHash === savedHash;
}

/**
 * Derive an AES-GCM CryptoKey from a user passcode or passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a JSON object with a password using AES-GCM 256
 */
export async function encryptData(data: any, passphrase: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);

  const ivBytes = new Uint8Array(12); // Standard 96-bit IV for AES-GCM
  window.crypto.getRandomValues(ivBytes);

  const key = await deriveKey(passphrase, saltBytes);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes.buffer as ArrayBuffer,
    },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    salt: bufferToBase64(saltBytes.buffer),
    iv: bufferToBase64(ivBytes.buffer),
  };
}

/**
 * Decrypt AES-GCM ciphertext using the password
 */
export async function decryptData(ciphertext: string, salt: string, iv: string, passphrase: string): Promise<any> {
  const saltBytes = base64ToBuffer(salt);
  const ivBytes = base64ToBuffer(iv);
  const cipherBytes = base64ToBuffer(ciphertext);

  const key = await deriveKey(passphrase, saltBytes);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes.buffer as ArrayBuffer,
      },
      key,
      cipherBytes.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('解密失敗，密碼可能不正確或備份檔案已損毀');
  }
}
