import User from '../models/User.js';

export const requireReauth = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user.reauthUntil || user.reauthUntil < new Date()) {
        return res.status(403).json({
            message: 'Re-authentication required'
        });
    }

    next();
};