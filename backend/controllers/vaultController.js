import User from '../models/User.js';
import Vault from '../models/Vault.js';
import { comparePassword } from '../services/auth/authService.js';
import { encrypt, decrypt, getCurrentKeyVersion } from '../services/encryption/encryptionService.js';
import { logActivity } from '../services/logging/logService.js';

// ➕ Create Vault Entry
export const createVault = async (req, res) => {
    try {
        const { name, password, note } = req.body;

        const keyVersion = getCurrentKeyVersion();

        const vault = await Vault.create({
            userId: req.user.id,
            name,
            password: encrypt(password),
            note: encrypt(note || ''),
            keyVersion
        });

        await logActivity({
            userId: req.user.id,
            action: 'VAULT_CREATED',
            req,
            metadata: { name }
        });

        res.json({ message: 'Vault entry created', vault });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getVaults = async (req, res) => {
    try {
        const vaults = await Vault.find({
            userId: req.user.id,
            isActive: true
        });

        const response = vaults.map(v => {
            let notePreview = '';

            try {
                const decryptedNote = v.note ? decrypt(v.note, v.keyVersion || 1) : '';
                notePreview = decryptedNote
                    ? decryptedNote.substring(0, 20) + '...'
                    : '';
            } catch {
                notePreview = '';
            }

            return {
                _id: v._id,
                name: v.name,
                password: '••••••••', // 🔐 masked
                note: notePreview, // 🧠 preview only
                hasPassword: true,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt
            };
        });

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getVaultById = async (req, res) => {
    try {
        const { id } = req.params;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id,
            isActive: true
        });

        if (!vault) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            _id: vault._id,
            name: vault.name,
            password: decrypt(vault.password, vault.keyVersion || 1),
            note: decrypt(vault.note, vault.keyVersion || 1),
            createdAt: vault.createdAt
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateVault = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, note } = req.body;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!vault) return res.status(404).json({ message: 'Not found' });

        // 🧠 Save version history
        vault.versionHistory.push({
            name: vault.name,
            password: vault.password,
            note: vault.note,
            keyVersion: vault.keyVersion,
            updatedAt: new Date()
        });

        // 🔄 Update fields
        if (name) vault.name = name;

        const keyVersion = getCurrentKeyVersion();

        if (password) {
            vault.password = encrypt(password);
            vault.keyVersion = keyVersion;
        }

        if (note) {
            vault.note = encrypt(note);
            vault.keyVersion = keyVersion;
        }

        vault.updatedAt = new Date();

        await vault.save();

        await logActivity({
            userId: req.user.id,
            action: 'VAULT_UPDATED',
            req,
            metadata: { vaultId: id }
        });

        res.json({ message: 'Updated successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteVault = async (req, res) => {
    try {
        const { id } = req.params;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!vault) return res.status(404).json({ message: 'Not found' });

        vault.isActive = false;
        vault.deletedAt = new Date();

        await vault.save();

        await logActivity({
            userId: req.user.id,
            action: 'VAULT_DELETED',
            req,
            metadata: { vaultId: id }
        });

        res.json({ message: 'Vault deleted (soft)' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getVaultHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!vault) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            versionHistory: vault.versionHistory
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const restoreVaultVersion = async (req, res) => {
    try {
        const { id, versionIndex } = req.params;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!vault) {
            return res.status(404).json({ message: 'Not found' });
        }

        const version = vault.versionHistory[versionIndex];

        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }

        // 🧠 Save current version before restore
        vault.versionHistory.push({
            name: vault.name,
            password: vault.password,
            note: vault.note,
            updatedAt: new Date()
        });

        // 🔄 Restore old version
        vault.name = version.name;
        vault.password = version.password;
        vault.note = version.note;
        vault.keyVersion = version.keyVersion || 1;
        vault.updatedAt = new Date();

        await vault.save();

        res.json({ message: 'Version restored successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const restoreDeletedVault = async (req, res) => {
    try {
        const { id } = req.params;

        const vault = await Vault.findOne({
            _id: id,
            userId: req.user.id,
            isActive: false
        });

        if (!vault) {
            return res.status(404).json({ message: 'Not found or already active' });
        }

        vault.isActive = true;
        vault.deletedAt = null;

        await vault.save();

        res.json({ message: 'Vault restored successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};