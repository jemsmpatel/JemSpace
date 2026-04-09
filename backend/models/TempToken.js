import mongoose from 'mongoose';

const tempTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    token: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: ['LOGIN', 'RECOVERY'], // ✅ correct way
        required: true
    },

    expiresAt: {
        type: Date,
        required: true
    }
});

export default mongoose.model('TempToken', tempTokenSchema);