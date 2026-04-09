import TokenBlacklist from '../models/TokenBlacklist.js';

export const cleanExpiredTokens = async () => {
    await TokenBlacklist.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};