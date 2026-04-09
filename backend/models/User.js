import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, index: true },

    password: String,
    secondaryPassword: String,

    name: { type: String, default: '' },

    reauthUntil: Date,

    refreshToken: String,

    isActive: { type: Boolean, default: true },

    devices: [
        {
            userAgent: String,
            ip: String,
            location: String,
            lastUsed: Date,

            isBlocked: { type: Boolean, default: false }, // ✅

            blockToken: String,          // ✅ ADD
            blockTokenExpiry: Date       // ✅ ADD
        }
    ],

    backupCodes: [
        {
            code: String,     // hashed
            used: { type: Boolean, default: false }
        }
    ],

    emails: [
        {
            email: String,
            addedAt: Date
        }
    ],
    pendingEmail: String,

    lastLoginIP: String,
    lastLoginLocation: String,

    // 🔐 RESET PASSWORD
    resetToken: String,
    resetTokenExpiry: Date,

    // 📊 EXTRA
    lastLogin: Date,
    failedAttempts: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);