import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
    token: String,
    expiresAt: Date
});

export default mongoose.model('TokenBlacklist', tokenBlacklistSchema);