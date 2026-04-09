import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema({
    ip: String,
    email: String,
    attempts: {
        type: Number,
        default: 0
    },
    blockUntil: Date
});

export default mongoose.model('LoginAttempt', loginAttemptSchema);