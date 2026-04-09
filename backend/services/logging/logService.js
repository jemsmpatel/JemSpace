import ActivityLog from '../../models/ActivityLog.js';

export const logActivity = async ({
    userId,
    action,
    req,
    metadata = {}
}) => {
    try {
        await ActivityLog.create({
            userId,
            action,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata
        });
    } catch (err) {
        console.log('Log error:', err.message);
    }
};