import mongoose from 'mongoose';

const vaultSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,

    name: String,
    password: String,
    note: String,

    isActive: { type: Boolean, default: true },

    versionHistory: [
        {
            name: String,
            password: String,
            note: String,
            updatedAt: Date
        }
    ],

    keyVersion: {
        type: Number,
        default: 1
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    deletedAt: Date
});

export default mongoose.model('Vault', vaultSchema);