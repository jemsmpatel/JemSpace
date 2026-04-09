import User from '../models/User.js';
import TempToken from '../models/TempToken.js';
import { logActivity } from '../services/logging/logService.js';
import { hashPassword, comparePassword } from '../services/auth/authService.js';
import { generateAccessToken, generateRefreshToken } from '../services/auth/tokenService.js';
import { generateSecureToken } from '../utils/generateSecureToken.js';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/email/emailService.js';
import LoginAttempt from '../models/LoginAttempt.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import { isStrongPassword } from '../utils/passwordValidator.js';
import crypto from 'crypto';
import { getClientInfo } from '../utils/getClientInfo.js';


// ✅ REGISTER
export const register = async (req, res) => {
    try {
        const { email, password, secondaryPassword, name } = req.body;

        if (!email || !password || !secondaryPassword || !name) {
            return res.status(400).json({ message: 'All fields required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 🔐 VALIDATE MAIN PASSWORD
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message:
                    'Password must be 8+ chars with uppercase, lowercase, number & special char'
            });
        }

        // 🔐 VALIDATE SECONDARY PASSWORD
        if (!isStrongPassword(secondaryPassword)) {
            return res.status(400).json({
                message:
                    'Secondary password must be strong'
            });
        }

        if (password === secondaryPassword) {
            return res.status(400).json({
                message: 'Primary and secondary password cannot be same'
            });
        }

        const hashedPassword = await hashPassword(password);
        const hashedSecondary = await hashPassword(secondaryPassword);

        const user = await User.create({
            email,
            name,
            password: hashedPassword,
            secondaryPassword: hashedSecondary
        });

        // 🔥 LOG REGISTER
        await logActivity({
            userId: user._id,
            action: 'USER_REGISTERED',
            req,
            metadata: { email }
        });

        res.json({ message: 'User registered successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ LOGIN STEP 1 (Password Check + Send 2FA)
export const loginStep1 = async (req, res) => {
    try {
        const { email, password, secondaryPassword } = req.body;

        // Always use generic response
        const invalidResponse = () =>
            res.status(401).json({ message: 'Invalid credentials' });

        const user = await User.findOne({ email, isActive: true });

        if (!user) return invalidResponse();

        const record = await LoginAttempt.findOne({ ip: req.ip, email });

        if (record && record.blockUntil && record.blockUntil > new Date()) {
            return res.status(429).json({
                message: 'Too many attempts. Try again later'
            });
        }

        const { ip } = getClientInfo(req);

        const blockedDevice = user.devices?.find(
            d => d.ip === ip && d.isBlocked
        );

        if (blockedDevice) {
            return res.status(403).json({
                message: 'This device is blocked retry after some time'
            });
        }

        const isMatch1 = await comparePassword(password, user.password);
        const isMatch2 = await comparePassword(secondaryPassword, user.secondaryPassword);

        if (!isMatch1 || !isMatch2) {

            let record = await LoginAttempt.findOne({ ip: req.ip, email });

            if (!record) {
                record = await LoginAttempt.create({
                    ip: req.ip,
                    email,
                    attempts: 1
                });
            } else {
                record.attempts += 1;

                // 🔥 Block after 5 attempts
                if (record.attempts >= 5) {
                    record.blockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min block
                    record.attempts = 0;
                }

                await record.save();
            }

            await logActivity({
                userId: user?._id,
                action: 'LOGIN_FAILED',
                req,
                metadata: { email }
            });

            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await LoginAttempt.deleteOne({ ip: req.ip, email });

        // ✅ Remove old tokens (important security)
        await TempToken.deleteMany({ userId: user._id });

        // ✅ Generate new 2FA token
        const token = generateSecureToken();

        await TempToken.create({
            userId: user._id,
            token,
            type: 'LOGIN', // ✅ ADD THIS
            expiresAt: new Date(Date.now() + 3 * 60 * 1000)
        });

        // ✅ Send ONLY 2FA email (no sensitive info)
        await sendEmail(
            user.email,
            'Your Login Verification Code',
            `
              <h2>🔐 Verification Code</h2>
              <p>Use this code to complete your login:</p>
              <h1 style="letter-spacing: 5px;">${token}</h1>
              <p>This code will expire in <b>2 minutes</b>.</p>
              <p>If you did not request this, ignore this email.</p>
            `
        );

        await logActivity({
            userId: user._id,
            action: 'LOGIN_STEP1_SUCCESS',
            req
        });

        res.json({ message: 'Verification code sent to email' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ LOGIN STEP 2 (Verify 2FA + Issue Tokens)
export const loginStep2 = async (req, res) => {
    try {
        const { email, token } = req.body;

        const invalidResponse = () =>
            res.status(401).json({ message: 'Invalid or expired token' });

        const user = await User.findOne({ email, isActive: true });
        if (!user) return invalidResponse();

        // ✅ IMPORTANT (await)
        const { ip, location } = await getClientInfo(req);
        const userAgent = req.headers['user-agent'];

        // ✅ ensure devices array
        user.devices = user.devices || [];

        const blockedDevice = user.devices.find(
            d => d.ip === ip && d.isBlocked
        );

        if (blockedDevice) {
            return res.status(403).json({
                message: 'This device is blocked 🚫'
            });
        }

        const record = await TempToken.findOne({
            userId: user._id,
            token,
            type: 'LOGIN'
        });

        if (!record || record.expiresAt < new Date()) {
            return invalidResponse();
        }

        await TempToken.deleteOne({ _id: record._id });

        const existingDevice = user.devices.find(
            d => d.userAgent === userAgent && d.ip === ip
        );

        // 🚫 BLOCKED DEVICE CHECK
        if (existingDevice?.isBlocked) {
            return res.status(403).json({
                message: 'This device is blocked 🚫'
            });
        }

        const isNewDevice = !existingDevice;
        const isNewLocation = user.lastLoginLocation !== location;

        let blockUrl = null;

        // 📱 NEW DEVICE
        if (isNewDevice) {

            // 🔥 LIMIT DEVICES (max 5)
            if (user.devices.length >= 5) {
                user.devices.shift(); // oldest remove
            }

            const blockToken = crypto.randomBytes(32).toString('hex');

            const hashedBlockToken = crypto
                .createHash('sha256')
                .update(blockToken)
                .digest('hex');

            const newDevice = {
                userAgent,
                ip,
                location,
                lastUsed: new Date(),
                isBlocked: false,
                blockToken: hashedBlockToken,
                blockTokenExpiry: Date.now() + 10 * 60 * 1000
            };

            user.devices.push(newDevice);

            blockUrl = `${process.env.PROJECT_URL}/api/v1/auth/block-device/${blockToken}`;
        } else {
            existingDevice.lastUsed = new Date();
        }

        // 🚨 SINGLE EMAIL (FIXED)
        if (isNewDevice || (isNewLocation && user.lastLoginLocation)) {
            await sendEmail(
                user.email,
                '⚠️ Suspicious Login Detected',
                `
                <h3>New Login Detected</h3>

                <p><b>Device:</b> ${userAgent}</p>
                <p><b>IP:</b> ${ip}</p>
                <p><b>Location:</b> ${location}</p>

                ${blockUrl
                    ? `
                        <p>If this wasn't you, block this device:</p>
                        <a href="${blockUrl}"
                        style="padding:10px 20px;background:red;color:white;text-decoration:none;border-radius:5px;">
                        🚫 Block This Device
                        </a>
                        <p>This link expires in 10 minutes.</p>
                        `
                    : `<p>If this wasn't you, secure your account.</p>`
                }
                `
            );
        }

        // 📊 UPDATE LOGIN INFO
        user.lastLogin = new Date();
        user.lastLoginIP = ip;
        user.lastLoginLocation = location;

        // 🔐 TOKENS
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;

        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth/refresh-token',
            maxAge: 24 * 60 * 60 * 1000
        });

        await logActivity({
            userId: user._id,
            action: 'LOGIN_SUCCESS',
            req,
            metadata: {
                ip,
                location,
                device: userAgent,
                isNewDevice,
                isNewLocation
            }
        });

        res.json({ accessToken });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


// ✅ refrash token to login again fast (Verify 2FA + Issue Tokens)
export const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({ message: 'Session expired' });
        }

        // 🔥 CHECK BLACKLIST
        const blacklisted = await TokenBlacklist.findOne({ token });

        if (blacklisted) {
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: 'Session expired' });
        }

        jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) {
                res.clearCookie('refreshToken');
                return res.status(403).json({ message: 'Session expired' });
            }

            const user = await User.findById(decoded.id);

            if (!user || user.refreshToken !== token) {
                await TokenBlacklist.create({ token });

                res.clearCookie('refreshToken');
                return res.status(403).json({ message: 'Session expired' });
            }

            // ✅ new token
            const newAccessToken = generateAccessToken({
                _id: user._id
            });

            res.json({ accessToken: newAccessToken });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ LOGOUT
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        // 🔥 blacklist refresh token
        if (refreshToken) {
            await TokenBlacklist.create({
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        }

        // 🔥 GET ACCESS TOKEN FROM HEADER
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.split(' ')[1];

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

                const user = await User.findById(decoded.id);

                if (user) {
                    user.refreshToken = null; // 🔥 REMOVE
                    await user.save();
                }
            } catch (err) {
                console.log("Access token invalid but continuing logout");
            }
        }

        // 🔥 CLEAR COOKIE
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth/refresh-token'
        });

        res.json({ message: 'Logged out successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ REAUTH
export const reAuthenticate = async (req, res) => {
    try {
        const { secondaryPassword } = req.body;

        if (!secondaryPassword) {
            return res.status(400).json({
                message: 'Secondary password required'
            });
        }

        const user = await User.findById(req.user.id);

        const isMatch = await comparePassword(
            secondaryPassword,
            user.secondaryPassword
        );

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid secondary password'
            });
        }

        // 🔓 Unlock for 5 minutes
        user.reauthUntil = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        res.json({ message: 'Re-auth successful (5 min unlocked)' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ UPDATE PROFILE
export const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;

        const user = await User.findById(req.user.id);

        user.name = name || user.name;

        await user.save();

        await logActivity({
            userId: user._id,
            action: 'PROFILE_UPDATED',
            req
        });

        res.json({ message: 'Profile updated' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ CHANGE PASSWORD
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, newSecondaryPassword } = req.body;

        const user = await User.findById(req.user.id);

        // ✅ verify old password
        const isMatch = await comparePassword(oldPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Wrong password' });
        }

        // ✅ strong password check
        if (newPassword && !isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: 'Password must be 12+ chars, include upper, lower, number, special char'
            });
        }

        if (newSecondaryPassword && !isStrongPassword(newSecondaryPassword)) {
            return res.status(400).json({
                message: 'Secondary password must be strong'
            });
        }

        if (newPassword === newSecondaryPassword) {
            return res.status(400).json({
                message: 'Primary and secondary password cannot be same'
            });
        }

        // ✅ update
        if (newPassword) {
            user.password = await hashPassword(newPassword);
        }

        if (newSecondaryPassword) {
            user.secondaryPassword = await hashPassword(newSecondaryPassword);
        }

        await user.save();

        await logActivity({
            userId: user._id,
            action: 'PASSWORD_CHANGED',
            req
        });

        res.json({ message: 'Password(s) updated successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });

        // IMPORTANT: security ke liye same response dena better hota hai
        if (!user) {
            return res.status(200).json({
                message: 'If email exists, reset link sent'
            });
        }

        // ✅ Strong token (64 hex chars)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // ✅ Hash token before saving
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetToken = hashedToken;

        // ✅ Expiry (10 min)
        user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

        await user.save();

        // ✅ ONLY TOKEN in URL (no email)
        const resetUrl = `${process.env.PROJECT_URL}/reset-password/${resetToken}`;

        await sendEmail(
            user.email,
            'Reset Password',
            `
            <h2>Reset Password</h2>
            <p>Click below:</p>
            <a href="${resetUrl}"
               style="padding:10px 20px;background:#ff6a00;color:white;text-decoration:none;border-radius:5px;">
                Reset Password
            </a>
            <p>Valid for 10 minutes</p>
            `
        );

        res.status(200).json({
            message: 'Reset link sent successfully'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
};


// ✅ RESET PASSWORD
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, newSecondaryPassword } = req.body;

        if (!token) {
            return res.status(400).json({
                message: 'Token is required'
            });
        }

        // ✅ Hash incoming token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // ✅ Find user ONLY by token (no email)
        const user = await User.findOne({
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired token'
            });
        }

        // ❌ same passwords not allowed
        if (newPassword === newSecondaryPassword) {
            return res.status(400).json({
                message: 'Primary and secondary password cannot be same'
            });
        }

        // ✅ validation
        if (newPassword && !isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: 'Weak password'
            });
        }

        if (newSecondaryPassword && !isStrongPassword(newSecondaryPassword)) {
            return res.status(400).json({
                message: 'Weak secondary password'
            });
        }

        // ✅ update passwords
        if (newPassword) {
            user.password = await hashPassword(newPassword);
        }

        if (newSecondaryPassword) {
            user.secondaryPassword = await hashPassword(newSecondaryPassword);
        }

        // ✅ cleanup
        user.resetToken = null;
        user.resetTokenExpiry = null;

        await user.save();

        await logActivity({
            userId: user._id,
            action: 'PASSWORD_RESET',
            req
        });

        res.status(200).json({
            message: 'Password reset successful'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
};


// ✅ GET PROFILE
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            '-password -secondaryPassword -resetToken -resetTokenExpiry -devices.blockToken -devices.blockTokenExpiry'
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ BLOCK / UNBLOCK DEVICE USING APP
export const toggleDeviceBlock = async (req, res) => {
    try {
        const { deviceId } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            console.log(user);
            return res.status(404).json({ message: 'User not found' });
        }

        const device = user.devices.id(deviceId);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const { ip } = getClientInfo(req);

        if (device.ip === ip) {
            return res.status(400).json({
                message: "You can't block current device"
            });
        }

        device.isBlocked = !device.isBlocked;

        await user.save();

        await logActivity({
            userId: user._id,
            action: device.isBlocked ? 'DEVICE_BLOCKED' : 'DEVICE_UNBLOCKED',
            req,
            metadata: {
                deviceId: device._id
            }
        });

        res.json({
            message: device.isBlocked
                ? 'Device blocked 🚫'
                : 'Device unblocked ✅'
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ✅ BLOCK / UNBLOCK DEVICE USING MAIL
export const blockDeviceFromEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            "devices.blockToken": hashedToken,
            "devices.blockTokenExpiry": { $gt: Date.now() }
        });

        if (!user) {
            return res.send('<h2>❌ Link expired or invalid</h2>');
        }

        const device = user.devices.find(
            d => d.blockToken === hashedToken
        );

        if (!device) {
            return res.send('<h2>❌ Device not found</h2>');
        }

        if (!device.blockTokenExpiry || device.blockTokenExpiry < Date.now()) {
            return res.send('<h2>❌ Link expired</h2>');
        }

        // 🚫 BLOCK
        device.isBlocked = true;

        // cleanup
        device.blockToken = null;
        device.blockTokenExpiry = null;

        await user.save();

        res.send(`
            <h2>✅ Device Blocked Successfully</h2>
            <p>You can now login safely.</p>
        `);

    } catch (err) {
        res.status(500).send('Error');
    }
};


// ✅ GENERATE BACKUP CODES
export const generateBackupCodes = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // generate 6 codes
        const rawCodes = Array.from({ length: 6 }, () =>
            crypto.randomBytes(4).toString('hex') // e.g. ab12cd34
        );

        // hash codes
        const hashedCodes = rawCodes.map(code => ({
            code: crypto.createHash('sha256').update(code).digest('hex'),
            used: false
        }));

        user.backupCodes = hashedCodes;
        await user.save();

        // 🔥 return RAW codes (only once)
        res.json({
            message: 'Backup codes generated',
            codes: rawCodes
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ✅ LOGIN WITH BACKUP CODES
export const loginWithBackupCode = async (req, res) => {
    try {
        const { email, backupCode } = req.body;

        const user = await User.findOne({ email, isActive: true });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { ip } = await getClientInfo(req);

        const hashed = crypto
            .createHash('sha256')
            .update(backupCode)
            .digest('hex');

        const codeObj = user.backupCodes.find(
            c => c.code === hashed && !c.used
        );

        if (!codeObj) {
            return res.status(401).json({ message: 'Invalid backup code' });
        }

        // ✅ mark as used
        codeObj.used = true;

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;

        await user.save();

        await sendEmail(
            user.email,
            '⚠️ Backup Code Login Detected',
            `
            <h3>Backup Code Login Used</h3>

            <p>Your account was accessed using a backup code.</p>

            <p><b>IP:</b> ${ip}</p>
            <p><b>Device:</b> ${req.headers['user-agent']}</p>

            <p>If this wasn't you:</p>
            <ul>
                <li>Change your password immediately</li>
                <li>Check your active devices</li>
                <li>Enable extra security</li>
            </ul>

            <p>If this was you, you can ignore this email.</p>
            `
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth/refresh-token',
            maxAge: 24 * 60 * 60 * 1000
        });

        await logActivity({
            userId: user._id,
            action: 'BACKUP_CODE_LOGIN',
            req,
            metadata: {
                ip,
                device: req.headers['user-agent']
            }
        });

        res.json({ accessToken });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ✅ ADD RECOVERY EMAIL
export const addRecoveryEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email required' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const user = await User.findById(req.user.id);

        // ✅ remove old recovery tokens (IMPORTANT)
        await TempToken.deleteMany({
            userId: user._id,
            type: 'RECOVERY'
        });

        // ✅ store pending email
        user.pendingEmail = email;
        await user.save();

        // 🔐 generate token (same as loginStep1)
        const token = generateSecureToken();

        await TempToken.create({
            userId: user._id,
            token,
            type: 'RECOVERY', // 🔥 VERY IMPORTANT
            expiresAt: new Date(Date.now() + 3 * 60 * 1000)
        });

        // 📩 send email
        await sendEmail(
            email,
            'Verify Your New Email',
            `
            <h2>🔐 Email Verification</h2>
            <p>Use this code to verify your new email:</p>
            <h1 style="letter-spacing:5px;">${token}</h1>
            <p>This code will expire in <b>2 minutes</b>.</p>
            <p>If this wasn't you, ignore this email.</p>
            `
        );

        await logActivity({
            userId: user._id,
            action: 'RECOVERY_EMAIL_ADDED',
            req,
            metadata: { email }
        });

        res.json({ message: 'Verification code sent to new email' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ✅ VERIFY RECOVERY EMAIL
export const verifyRecoveryEmail = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findById(req.user.id);

        if (!user || !user.pendingEmail) {
            return res.status(400).json({ message: 'No email to verify' });
        }

        const record = await TempToken.findOne({
            userId: user._id,
            token,
            type: 'RECOVERY'
        });

        if (!record || record.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // ❌ delete all recovery tokens
        await TempToken.deleteMany({
            userId: user._id,
            type: 'RECOVERY'
        });

        // ✅ backup old email
        user.emails = user.emails || [];
        user.emails.push({
            email: user.email,
            addedAt: new Date()
        });

        // ✅ update email
        user.email = user.pendingEmail;
        user.pendingEmail = null;

        user.mustRecover = false;

        // 🔥 🔐 GENERATE RESET TOKEN
        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetToken = hashedToken;
        user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

        await user.save();

        await logActivity({
            userId: user._id,
            action: 'RECOVERY_EMAIL_VERIFIED',
            req,
            metadata: { newEmail: user.email }
        });

        // 🔥 send BOTH: message + resetToken
        res.json({
            message: 'Email updated successfully ✅',
            resetToken // 🔥 IMPORTANT
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};