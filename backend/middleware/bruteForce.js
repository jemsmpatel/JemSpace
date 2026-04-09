import LoginAttempt from '../models/LoginAttempt.js';

export const checkBruteForce = async (req, res, next) => {
    const ip = req.ip;
    const { email } = req.body;

    const record = await LoginAttempt.findOne({ ip, email });

    if (record && record.blockUntil && record.blockUntil > new Date()) {
        return res.status(429).json({
            message: 'Too many failed attempts. Try later.'
        });
    }

    next();
};