import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

// 🔐 Multiple keys
const KEYS = {
    1: process.env.AES_SECRET_KEY_V1,
    2: process.env.AES_SECRET_KEY_V2
};

// 👉 current active key
const CURRENT_KEY_VERSION = 1;

// 🔐 ENCRYPT
export const encrypt = (text) => {
    const key = KEYS[CURRENT_KEY_VERSION];

    return CryptoJS.AES.encrypt(text, key).toString();
};

// 🔓 DECRYPT
export const decrypt = (cipher, version = 1) => {
    try {
        if (!cipher || typeof cipher !== 'string') return '';

        // optional validation
        if (!cipher.startsWith('U2FsdGVkX1')) return '';

        const key = KEYS[version];

        if (!key) return '';

        const bytes = CryptoJS.AES.decrypt(cipher, key);

        const result = bytes.toString(CryptoJS.enc.Utf8);

        return result || '';

    } catch (err) {
        console.log("Decrypt error:", err.message);
        return '';
    }
};

// expose version
export const getCurrentKeyVersion = () => CURRENT_KEY_VERSION;