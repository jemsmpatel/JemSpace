import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
// import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import { cleanExpiredTokens } from './utils/cleanup.js';


import authRoutes from './routes/authRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import noteRoutes from './routes/noteRoutes.js';


const app = express();

setInterval(() => {
    cleanExpiredTokens();
}, 60 * 60 * 1000);

// 🔐 Security Middleware
app.use(helmet());

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// app.use(xss());
app.use((req, res, next) => {
    if (req.body) {
        req.body = mongoSanitize.sanitize(req.body);
    }
    next();
});

// 🚫 Rate Limiting (Brute-force protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // max 100 requests
    message: 'Too many requests, try again later'
});
app.use(limiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/notes', noteRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Serve Vite build (dist)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// fallback (React routing fix)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: "API route not found" });
    }
    res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

export default app;