import express from 'express';
import {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
    getNoteHistory,
    restoreNoteVersion,
    restoreDeletedNote
} from '../controllers/noteController.js';

import { verifyAccessToken } from '../middleware/authMiddleware.js';
import { requireReauth } from '../middleware/requireReauth.js';

const router = express.Router();

router.post('/', verifyAccessToken, requireReauth, createNote);
router.get('/', verifyAccessToken, getNotes);
router.get('/:id', verifyAccessToken, requireReauth, getNoteById);

router.get('/:id/history', verifyAccessToken, getNoteHistory);

router.post(
    '/:id/restore/:versionIndex',
    verifyAccessToken,
    requireReauth,
    restoreNoteVersion
);

router.post(
    '/:id/restore-deleted',
    verifyAccessToken,
    requireReauth,
    restoreDeletedNote
);

// 🔐 protected
router.put('/:id', verifyAccessToken, requireReauth, updateNote);
router.delete('/:id', verifyAccessToken, requireReauth, deleteNote);

export default router;