import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiRequest } from '../redux/api/apiSlice';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');

    const handleSubmit = async () => {
        if (!email) return toast.error("Email required");

        const loading = toast.loading("Sending...");

        try {
            const res = await apiRequest({
                url: '/auth/forgot-password',
                method: 'POST',
                body: { email }
            });

            toast.dismiss(loading);
            toast.success(res.message);

        } catch (err) {
            toast.dismiss(loading);
            toast.error(err.message || "Something went wrong");
        }
    };

    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
            <motion.div className="bg-white/5 p-8 rounded-xl space-y-4 w-80">

                <h1 className="text-xl font-bold text-center">Forgot Password</h1>

                <input
                    type="email"
                    placeholder="Enter email"
                    className="w-full p-3 bg-gray-800 rounded"
                    onChange={e => setEmail(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 py-2 rounded"
                >
                    Send Reset Link
                </button>

            </motion.div>
        </div>
    );
}