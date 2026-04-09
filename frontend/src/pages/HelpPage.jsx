import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function HelpPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 text-white px-6 py-10">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6"
            >
                <h1 className="text-3xl font-bold text-center mb-4">Help & Instructions</h1>

                {/* General Instructions */}
                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">Getting Started</h2>
                    <p className="text-gray-300">
                        - Register an account if you haven't yet. <br />
                        - Login using your email + password + secondary password. <br />
                        - If you forget your password, use the "Forgot Password?" link.
                    </p>
                </section>

                {/* Backup Code Instructions */}
                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">Using Backup Codes</h2>
                    <p className="text-gray-300">
                        Backup codes allow you to login if you cannot use your main credentials.
                        Each code can only be used once.
                    </p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-1">
                        <li>Go to <span className="text-blue-400 cursor-pointer" onClick={() => navigate('/login-backup')}>Backup Login Page</span>.</li>
                        <li>Enter your registered email.</li>
                        <li>Enter one of your unused backup codes.</li>
                        <li>Click <b>Login with Backup Code</b>.</li>
                        <li>You will receive a notification email about this login for security purposes.</li>
                    </ol>
                    <p className="text-gray-300">
                        If you haven’t generated backup codes yet, go to your <b>Profile → Security</b> to generate and save them safely.
                    </p>
                </section>

                {/* Security Tips */}
                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">Security Tips</h2>
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                        <li>Never share your backup codes.</li>
                        <li>Use strong and unique passwords.</li>
                        <li>Always log out from shared devices.</li>
                        <li>Enable extra security features from your profile.</li>
                    </ul>
                </section>

                {/* Back Button */}
                <div className="text-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 px-6 py-2 bg-purple-600 rounded-xl hover:opacity-90 font-semibold"
                    >
                        Back
                    </button>
                </div>
            </motion.div>
        </div>
    );
}