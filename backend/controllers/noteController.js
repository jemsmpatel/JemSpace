import Note from '../models/Note.js';
import { encrypt, decrypt, getCurrentKeyVersion } from '../services/encryption/encryptionService.js';
import { logActivity } from '../services/logging/logService.js';

export const createNote = async (req, res) => {
    try {
        const { title, content } = req.body;

        const keyVersion = getCurrentKeyVersion();

        const note = await Note.create({
            userId: req.user.id,
            title,
            content: encrypt(content),
            keyVersion
        });

        await logActivity({
            userId: req.user.id,
            action: 'NOTE_CREATED',
            req,
            metadata: { title }
        });

        res.json({ message: 'Note created', note });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getNotes = async (req, res) => {
    try {
        const notes = await Note.find({
            userId: req.user.id,
            isActive: true
        });

        const response = notes.map(n => ({
            _id: n._id,
            title: n.title,
            preview: '••••••••', // 🔐 hidden
            createdAt: n.createdAt,
            updatedAt: n.updatedAt
        }));

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getNoteById = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id,
            isActive: true
        });

        if (!note) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            _id: note._id,
            title: note.title,
            content: decrypt(note.content, note.keyVersion),
            createdAt: note.createdAt
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!note) return res.status(404).json({ message: 'Not found' });

        // ✅ SAVE OLD DATA ONLY ONCE
        note.versionHistory.push({
            title: note.title, // 🔥 ADD
            content: note.content,
            keyVersion: note.keyVersion,
            updatedAt: new Date(),
            action: 'UPDATED'
        });

        if (title) note.title = title;

        const keyVersion = getCurrentKeyVersion();

        if (content) {
            note.content = encrypt(content);
            note.keyVersion = keyVersion;
        }

        note.updatedAt = new Date();

        await note.save();

        await logActivity({
            userId: req.user.id,
            action: 'NOTE_UPDATED',
            req,
            metadata: { noteId: id }
        });

        res.json({ message: 'Note updated' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!note) return res.status(404).json({ message: 'Not found' });

        note.versionHistory.push({
            title: note.title,
            content: note.content,
            keyVersion: note.keyVersion,
            updatedAt: new Date(),
            action: 'DELETED'
        });

        note.isActive = false;
        note.deletedAt = new Date();

        await note.save();

        await logActivity({
            userId: req.user.id,
            action: 'NOTE_DELETED',
            req,
            metadata: { noteId: id }
        });

        res.json({ message: 'Note deleted (soft)' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getNoteHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!note) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            versionHistory: note.versionHistory
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const restoreNoteVersion = async (req, res) => {
    try {
        const { id, versionIndex } = req.params;

        const index = parseInt(versionIndex); // ✅ FIX

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!note) {
            return res.status(404).json({ message: 'Not found' });
        }

        if (!note.versionHistory || note.versionHistory.length === 0) {
            return res.status(400).json({ message: 'No history available' });
        }

        const version = note.versionHistory[index];

        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }

        // 🧠 Save current version BEFORE restore
        note.versionHistory.push({
            title: note.title, // 🔥 ADD
            content: note.content,
            keyVersion: note.keyVersion,
            updatedAt: new Date(),
            action: 'RESTORE_BACKUP'
        });

        // 🔄 Restore safely
        note.content = version.content || note.content;
        note.keyVersion = version.keyVersion || 1;

        // ⚠️ agar future me title bhi store kare history me
        if (version.title) {
            note.title = version.title;
        }

        note.updatedAt = new Date();

        await note.save();

        await logActivity({
            userId: req.user.id,
            action: 'NOTE_RESTORED',
            req,
            metadata: { noteId: id, versionIndex: index }
        });

        res.json({ message: 'Note restored successfully' });

    } catch (err) {
        console.log("Restore error:", err); // 🔥 debug
        res.status(500).json({ error: err.message });
    }
};

export const restoreDeletedNote = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findOne({
            _id: id,
            userId: req.user.id,
            isActive: false
        });

        if (!note) {
            return res.status(404).json({ message: 'Not found or already active' });
        }

        note.isActive = true;
        note.deletedAt = null;

        await note.save();

        await logActivity({
            userId: req.user.id,
            action: 'NOTE_RESTORED_DELETED',
            req,
            metadata: { noteId: id }
        });

        res.json({ message: 'Note restored successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};