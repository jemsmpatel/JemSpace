import express from 'express';
import {
    register,
    loginStep1,
    loginStep2,
    logout,
    refreshAccessToken,
    reAuthenticate,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    getProfile,
    toggleDeviceBlock,
    blockDeviceFromEmail,
    generateBackupCodes,
    loginWithBackupCode,
    addRecoveryEmail,
    verifyRecoveryEmail
} from '../controllers/authController.js';
import { checkBruteForce } from '../middleware/bruteForce.js';
import { verifyAccessToken } from '../middleware/authMiddleware.js';
import { requireReauth } from '../middleware/requireReauth.js';

const router = express.Router();

router.post('/refresh-token', refreshAccessToken);
router.post('/register', register);
router.post('/login-step1', checkBruteForce, loginStep1);
router.post('/login-step2', loginStep2);
router.post('/logout', logout);
router.post('/reauth', verifyAccessToken, reAuthenticate);

router.post('/forgot-password', checkBruteForce, forgotPassword);
router.post('/reset-password', checkBruteForce, resetPassword);

// 👤 PROFILE
router.get('/profile', verifyAccessToken, getProfile);
router.put('/profile', verifyAccessToken, requireReauth, updateProfile);
router.put('/change-password', verifyAccessToken, requireReauth, changePassword);
router.post('/toggle-device', verifyAccessToken, requireReauth, toggleDeviceBlock);
router.get('/block-device/:token', blockDeviceFromEmail);

router.post('/generate-backup-codes', verifyAccessToken, requireReauth, generateBackupCodes);
router.post('/login-backup', loginWithBackupCode);

router.post('/add-recovery-email', verifyAccessToken, addRecoveryEmail);
router.post('/verify-recovery-email', verifyAccessToken, verifyRecoveryEmail);

export default router;