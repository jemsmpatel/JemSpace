import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiRequest } from '../redux/api/apiSlice';

export default function ResetPassword() {
    const { id: token } = useParams(); // ✅ token from URL
    const navigate = useNavigate();

    const [form, setForm] = useState({
        password: '',
        confirmPassword: '',
        secondaryPassword: '',
        confirmSecondaryPassword: ''
    });

    // ❗ invalid token case (optional but good UX)
    if (!token) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
                Invalid or expired reset link
            </div>
        );
    }

    const handleReset = async () => {
        const {
            password,
            confirmPassword,
            secondaryPassword,
            confirmSecondaryPassword
        } = form;

        if (!password) return toast.error("Password required");

        if (password !== confirmPassword)
            return toast.error("Primary password mismatch");

        if (secondaryPassword !== confirmSecondaryPassword)
            return toast.error("Secondary password mismatch");

        if (password === secondaryPassword)
            return toast.error("Passwords must be different");

        const loading = toast.loading("Resetting...");

        try {
            await apiRequest({
                url: '/auth/reset-password',
                method: 'POST',
                body: {
                    token, // ✅ only token भेज रहे हैं
                    newPassword: password,
                    newSecondaryPassword: secondaryPassword
                }
            });

            toast.dismiss(loading);
            toast.success("Password reset success 🎉");

            navigate('/'); // login page

        } catch (err) {
            toast.dismiss(loading);
            toast.error(
                err?.response?.data?.message || "Something went wrong"
            );
        }
    };

    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white px-4">

            <div className="bg-white/5 p-8 rounded-xl space-y-4 w-full max-w-md backdrop-blur-md">

                <h1 className="text-xl font-bold text-center">
                    Reset Password
                </h1>

                <input
                    type="password"
                    placeholder="New Password"
                    className="w-full p-3 bg-gray-800 rounded outline-none"
                    onChange={e => setForm({ ...form, password: e.target.value })}
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    className="w-full p-3 bg-gray-800 rounded outline-none"
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                />

                <input
                    type="password"
                    placeholder="Secondary Password"
                    className="w-full p-3 bg-gray-800 rounded outline-none"
                    onChange={e => setForm({ ...form, secondaryPassword: e.target.value })}
                />

                <input
                    type="password"
                    placeholder="Confirm Secondary Password"
                    className="w-full p-3 bg-gray-800 rounded outline-none"
                    onChange={e => setForm({ ...form, confirmSecondaryPassword: e.target.value })}
                />

                <button
                    onClick={handleReset}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition py-2 rounded"
                >
                    Reset Password
                </button>

            </div>
        </div>
    );
}