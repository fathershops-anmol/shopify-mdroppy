import CryptoJS from 'crypto-js';

export function encryptValue(value: string, expiry: number | null = null): string {
    // Prepare the data object similar to PHP structure
    const data = {
        value: value,
        timestamp: expiry ? Math.floor(Date.now() / 1000) : null,
        expiry: expiry
    };

    // Stringify the data with same structure as PHP's json_encode
    const jsonData = JSON.stringify(data);

    // Make sure your APP_KEY is exactly the same as PHP's config('app.key')
    // If PHP key is base64-encoded, use CryptoJS.enc.Base64.parse()
    const key = CryptoJS.enc.Utf8.parse('base64:Kl3wOkx+wZKI5T1IqclqJN6Y3mvdWis4qA4OrSNxQX8=');

    // Generate random IV (16 bytes for AES-256-CBC)
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt with AES-256-CBC with explicit IV
    const encrypted = CryptoJS.AES.encrypt(jsonData, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Combine IV and ciphertext exactly like PHP does
    // 1. Convert IV and ciphertext to WordArrays
    // 2. Concatenate them
    // 3. Convert to Base64 string
    const ivWithCiphertext = iv.concat(encrypted.ciphertext);
    
    return ivWithCiphertext.toString(CryptoJS.enc.Base64);
}