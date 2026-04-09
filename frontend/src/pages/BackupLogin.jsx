import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, KeyRound, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { apiRequest } from "../redux/api/apiSlice";
import { loginWithBackup } from "../redux/features/authSlice";
import { useDispatch } from "react-redux";

export default function BackupLogin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", backupCode: "" });
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleLogin = async () => {
        if (!form.email || !form.backupCode) {
            return toast.error("All fields required");
        }

        const toastId = toast.loading("Logging in with backup code...");

        try {
            setLoading(true);

            const res = await dispatch(loginWithBackup(form));

            toast.dismiss(toastId);

            if (res.meta.requestStatus === "fulfilled") {

                toast.success("Login successful ✅");

                navigate("/recover-account");

            } else {
                toast.error(res.payload || "Login failed ❌");
            }

        } catch (err) {
            toast.dismiss(toastId);
            toast.error("Something went wrong ❌");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-black via-gray-900 to-gray-800 text-white px-4">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 space-y-5"
            >
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="bg-purple-600/20 p-3 rounded-full">
                            <Shield className="w-6 h-6" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold">Backup Code Login</h1>
                    <p className="text-gray-400 text-sm">
                        Use your recovery backup code
                    </p>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-purple-400" />
                        <input
                            type="text"
                            placeholder="Backup Code"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500"
                            value={form.backupCode}
                            onChange={(e) => setForm({ ...form, backupCode: e.target.value })}
                        />
                    </div>
                </div>

                {/* Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:opacity-90 font-semibold"
                >
                    {loading ? "Logging in..." : "Login with Backup Code"}
                </motion.button>

                {/* Back to login */}
                <p className="text-center text-gray-400 text-sm">
                    Back to{" "}
                    <span
                        onClick={() => navigate("/")}
                        className="text-blue-400 cursor-pointer hover:underline"
                    >
                        normal login
                    </span>
                </p>
            </motion.div>
        </div>
    );
}