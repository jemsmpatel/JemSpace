import crypto from 'crypto';

export const generateSecureToken = () => {
    const chars =
        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

    let token = '';
    const length = 10;

    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        const index = randomBytes[i] % chars.length;
        token += chars[index];
    }

    return token;
};