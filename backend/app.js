import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
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
app.use(cors({
    origin: `http://${process.env.PROJECT_IP}:5173`,
    credentials: true
}));
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

// Routes placeholder
app.get('/', (req, res) => {
    res.send('Secure Vault API Running');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/notes', noteRoutes);

export default app;