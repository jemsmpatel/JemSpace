import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { apiRequest } from "../redux/api/apiSlice";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/features/authSlice";

export default function RecoverAccount() {
    const { accessToken } = useSelector(state => state.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120); // 2 min
    const [expired, setExpired] = useState(false);


    useEffect(() => {
        if (step !== 2) return;

        if (timeLeft <= 0) {
            setExpired(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, step]);

    // 📩 SEND OTP
    const handleSendOtp = async () => {
        if (!email) return toast.error("Email required");

        const t = toast.loading("Sending OTP...");

        try {
            setLoading(true);

            await apiRequest({
                url: "/auth/add-recovery-email", // ✅ FIXED
                method: "POST",
                body: { email }
            });

            toast.dismiss(t);
            toast.success("OTP sent 📩");

            setStep(2);
        } catch (err) {
            toast.dismiss(t);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        const t = toast.loading("Resending...");

        try {
            await apiRequest({
                url: "/auth/add-recovery-email",
                method: "POST",
                body: { email }
            });

            toast.dismiss(t);
            toast.success("New code sent 📩");

            // 🔥 reset timer
            setTimeLeft(120);
            setExpired(false);

        } catch (err) {
            toast.dismiss(t);
            toast.error(err.message);
        }
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    // ✅ VERIFY OTP
    const handleVerify = async () => {
        if (!otp) return toast.error("Enter OTP");

        const t = toast.loading("Verifying...");

        try {
            setLoading(true);

            const res = await apiRequest({
                url: "/auth/verify-recovery-email",
                method: "POST",
                token: accessToken,
                body: { token: otp }
            });

            toast.dismiss(t);
            toast.success("Email updated 🎉");

            // 🔥 STEP 1: logout from backend
            try {
                await apiRequest({
                    url: '/auth/logout',
                    method: 'POST',
                    token: accessToken
                });
            } catch (err) {
                console.log("Logout API failed:", err.message);
            }

            // 🔥 STEP 2: clear redux + local
            dispatch(logout());

            // 🔥 STEP 3: redirect to reset password
            setTimeout(() => {
                navigate(`/reset-password/${res.resetToken}`);
            }, 100);

        } catch (err) {
            toast.dismiss(t);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 p-8 rounded-2xl border border-white/10 space-y-5"
            >

                <div className="text-center">
                    <h1 className="text-2xl font-bold">Recover Account</h1>
                    <p className="text-gray-400 text-sm">
                        Secure your account after backup login
                    </p>
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                    <>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="email"
                                placeholder="New Email"
                                className="w-full pl-10 py-3 bg-gray-800 rounded"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSendOtp}
                            disabled={loading}
                            className="w-full bg-purple-600 py-3 rounded"
                        >
                            Send Verifiction code
                        </button>
                    </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <>
                        <div className="relative">
                            <ShieldCheck className="absolute left-3 top-3 text-green-400" />
                            <input
                                type="text"
                                placeholder="Enter Verification code"
                                className="w-full pl-10 py-3 bg-gray-800 rounded"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className="w-full bg-green-600 py-3 rounded"
                        >
                            Verify & Secure Account
                        </button>

                        {/* TIMER / RESEND */}
                        <div className="text-center text-sm text-gray-400">
                            {!expired ? (
                                <p>Code expires in {formatTime(timeLeft)}</p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    className="text-blue-400 hover:underline"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </>
                )}

            </motion.div>
        </div>
    );
}