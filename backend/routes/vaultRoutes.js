import express from 'express';
import {
    createVault,
    getVaults,
    getVaultById,
    updateVault,
    deleteVault,
    getVaultHistory,
    restoreVaultVersion,
    restoreDeletedVault,
} from '../controllers/vaultController.js';

import { verifyAccessToken } from '../middleware/authMiddleware.js';
import { requireReauth } from '../middleware/requireReauth.js';

const router = express.Router();

router.post('/', verifyAccessToken, requireReauth, createVault);
router.get('/', verifyAccessToken, getVaults);
router.get('/:id', verifyAccessToken, requireReauth, getVaultById);
router.put('/:id', verifyAccessToken, requireReauth, updateVault);
router.delete('/:id', verifyAccessToken, requireReauth, deleteVault);
router.get('/:id/history', verifyAccessToken, requireReauth, getVaultHistory);
router.post('/:id/restore/:versionIndex', verifyAccessToken, requireReauth, restoreVaultVersion);
router.post('/:id/restore-deleted', verifyAccessToken, requireReauth, restoreDeletedVault);

export default router;