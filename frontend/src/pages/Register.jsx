import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiRequest } from '../redux/api/apiSlice';

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        secondaryPassword: '',
        confirmSecondaryPassword: ''
    });

    const [showTooltip, setShowTooltip] = useState(false);

    // 🔐 password rules
    const checkPassword = (password) => {
        return {
            length: password.length >= 8,
            lower: /[a-z]/.test(password),
            upper: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&]/.test(password)
        };
    };

    const isStrong = (password) => {
        const checks = checkPassword(password);
        return Object.values(checks).every(Boolean);
    };

    const handleRegister = async () => {
        const {
            name,
            email,
            password,
            confirmPassword,
            secondaryPassword,
            confirmSecondaryPassword
        } = form;

        if (!name || !email || !password || !secondaryPassword) {
            return toast.error("All fields required");
        }

        if (password !== confirmPassword) {
            return toast.error("Password mismatch");
        }

        if (secondaryPassword !== confirmSecondaryPassword) {
            return toast.error("Secondary password mismatch");
        }

        if (password === secondaryPassword) {
            return toast.error("Passwords must be different");
        }

        if (!isStrong(password) || !isStrong(secondaryPassword)) {
            return toast.error("Use strong passwords 💀");
        }

        const loading = toast.loading("Creating account...");

        try {
            await apiRequest({
                url: '/auth/register',
                method: 'POST',
                body: {
                    name,
                    email,
                    password,
                    secondaryPassword
                }
            });

            toast.dismiss(loading);
            toast.success("Account created 🎉");

            navigate('/');

        } catch (err) {
            toast.dismiss(loading);
            toast.error(err.message || "Register failed ❌");
        }
    };

    const passwordChecks = checkPassword(form.password);

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-black via-gray-900 to-gray-800 text-white px-4">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-5"
            >

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Create Account</h1>
                    <p className="text-gray-400 text-sm">Secure vault access 🔐</p>
                </div>

                {/* Inputs */}
                <div className="space-y-3">

                    <input
                        placeholder="Name"
                        className="w-full p-3 rounded-xl bg-gray-800"
                        onChange={e => setForm({ ...form, name: e.target.value })}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 rounded-xl bg-gray-800"
                        onChange={e => setForm({ ...form, email: e.target.value })}
                    />

                    {/* PASSWORD FIELD */}
                    <div className="relative">

                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-3 rounded-xl bg-gray-800 pr-10"
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />

                        {/* ℹ️ Tooltip Icon */}
                        <div
                            className="absolute right-3 top-3 cursor-pointer text-gray-400"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <Info size={18} />
                        </div>

                        {/* Tooltip */}
                        {showTooltip && (
                            <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs z-50 shadow-lg">
                                <p className={passwordChecks.length ? "text-green-400" : "text-gray-400"}>
                                    ✔ At least 8 characters
                                </p>
                                <p className={passwordChecks.upper ? "text-green-400" : "text-gray-400"}>
                                    ✔ One uppercase letter
                                </p>
                                <p className={passwordChecks.lower ? "text-green-400" : "text-gray-400"}>
                                    ✔ One lowercase letter
                                </p>
                                <p className={passwordChecks.number ? "text-green-400" : "text-gray-400"}>
                                    ✔ One number
                                </p>
                                <p className={passwordChecks.special ? "text-green-400" : "text-gray-400"}>
                                    ✔ One special character (@$!%*?&)
                                </p>
                            </div>
                        )}
                    </div>

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        className="w-full p-3 rounded-xl bg-gray-800"
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Secondary Password"
                        className="w-full p-3 rounded-xl bg-gray-800"
                        onChange={e => setForm({ ...form, secondaryPassword: e.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Confirm Secondary Password"
                        className="w-full p-3 rounded-xl bg-gray-800"
                        onChange={e => setForm({ ...form, confirmSecondaryPassword: e.target.value })}
                    />

                </div>

                {/* Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRegister}
                    className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 font-semibold"
                >
                    Register Securely
                </motion.button>

                {/* Login link */}
                <p className="text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <span
                        onClick={() => navigate('/')}
                        className="text-blue-400 cursor-pointer hover:underline"
                    >
                        Login
                    </span>
                </p>

            </motion.div>
        </div>
    );
}