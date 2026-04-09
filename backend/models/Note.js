import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: String,

    content: String, // 🔐 encrypted

    keyVersion: {
        type: Number,
        default: 1
    },

    isActive: {
        type: Boolean,
        default: true
    },

    versionHistory: [
        {
            title: String, // 🔥 ADD THIS
            content: String,
            keyVersion: Number,
            updatedAt: Date,
            action: String
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: Date,
    deletedAt: Date
});

export default mongoose.model('Note', noteSchema);