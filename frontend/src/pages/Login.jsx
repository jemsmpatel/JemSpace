import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loginStep1, loginStep2 } from '../redux/features/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);

    const [form, setForm] = useState({
        email: '',
        password: '',
        secondaryPassword: ''
    });

    const [code, setCode] = useState('');

    // ⏱ TIMER
    const [timer, setTimer] = useState(120);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (step !== 2) return;

        if (timer <= 0) {
            setExpired(true);
            return;
        }

        const interval = setInterval(() => {
            setTimer(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timer, step]);

    // 🔐 LOGIN STEP 1
    const handleLogin = async () => {
        if (!form.email || !form.password || !form.secondaryPassword) {
            return toast.error("All fields are required");
        }

        const loadingToast = toast.loading("Logging in...");

        const res = await dispatch(loginStep1(form));

        toast.dismiss(loadingToast);

        if (res.meta.requestStatus === 'fulfilled') {
            toast.success("Verification code sent 📩");

            setStep(2);          // 🔥 IMPORTANT
            setTimer(120);       // reset timer
            setExpired(false);
        } else {
            toast.error(res.payload?.message || "Login failed ❌");
        }
    };

    // 🔁 RESEND
    const handleResend = async () => {
        const t = toast.loading("Resending...");

        const res = await dispatch(loginStep1(form));

        toast.dismiss(t);

        if (res.meta.requestStatus === 'fulfilled') {
            toast.success("New code sent 📩");
            setTimer(120);
            setExpired(false);
        } else {
            toast.error("Failed ❌");
        }
    };

    // ✅ VERIFY
    const handleVerify = async () => {
        if (!code) {
            return toast.error("Enter verification code");
        }

        const loadingToast = toast.loading("Verifying...");

        const res = await dispatch(
            loginStep2({ email: form.email, token: code })
        );

        toast.dismiss(loadingToast);

        if (res.meta.requestStatus === 'fulfilled') {
            toast.success("Login successful 🚀");
            navigate('/dashboard');
        } else {
            toast.error(res.payload?.message || "Invalid code ❌");
        }
    };

    const formatTime = () => {
        const m = String(Math.floor(timer / 60)).padStart(2, '0');
        const s = String(timer % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-black via-gray-900 to-gray-800 text-white px-4">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 space-y-4"
            >

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="bg-blue-600/20 p-3 rounded-full">
                            {step === 1 ? <Lock /> : <ShieldCheck />}
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-wide">
                        {step === 1 ? "Secure Vault" : "Verify"}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {step === 1
                            ? "Access your encrypted dashboard"
                            : `Code sent to ${form.email}`}
                    </p>
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                    <>
                        <div className="space-y-4">

                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700"
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700"
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>

                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-purple-400" />
                                <input
                                    type="password"
                                    placeholder="Secondary Password"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700"
                                    onChange={e => setForm({ ...form, secondaryPassword: e.target.value })}
                                />
                            </div>

                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLogin}
                            className="w-full py-3 rounded-xl bg-linear-to-r from-blue-600 to-purple-600 font-semibold"
                        >
                            Login Securely
                        </motion.button>

                        {/* Divider */}
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <div className="flex-1 h-px bg-gray-700" />
                            SECURE LOGIN
                            <div className="flex-1 h-px bg-gray-700" />
                        </div>

                        {/* Footer */}
                        <p className="text-center text-gray-500 text-xs">
                            End-to-end encrypted • Zero knowledge security 🔒
                        </p>

                        <p className="text-center text-gray-400 text-sm">
                            Don't have an account?{" "}
                            <span
                                onClick={() => navigate('/register')}
                                className="text-blue-400 cursor-pointer hover:underline"
                            >
                                Register
                            </span>
                        </p>

                        {/* Footer */}
                        <p className="text-center text-gray-400 text-sm mt-2">
                            Need help?{" "}
                            <span
                                onClick={() => navigate('/help')}
                                className="text-blue-400 cursor-pointer hover:underline"
                            >
                                Visit Help Page
                            </span>
                        </p>
                    </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <>
                        <input
                            type="text"
                            placeholder="Enter verification code"
                            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-center tracking-widest text-lg"
                            onChange={e => setCode(e.target.value)}
                        />

                        {/* TIMER / RESEND */}
                        {!expired ? (
                            <p className="text-center text-sm text-gray-400">
                                Expires in: {formatTime()}
                            </p>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="text-blue-400 text-sm underline w-full"
                            >
                                Resend Code
                            </button>
                        )}

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleVerify}
                            className="w-full py-3 rounded-xl bg-linear-to-r from-green-500 to-emerald-600 font-semibold"
                        >
                            Verify & Continue
                        </motion.button>
                    </>
                )}

            </motion.div>
        </div>
    );
}