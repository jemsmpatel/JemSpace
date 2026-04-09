import { useState } from 'react';

export default function ReAuthModal({ onVerify, onClose }) {
    const [password, setPassword] = useState('');

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">

            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4">

                <h2 className="text-lg font-semibold">🔒 Security Check</h2>

                <input
                    type="password"
                    placeholder="Enter Secondary Password"
                    className="w-full p-3 bg-gray-900 rounded"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded">
                        Cancel
                    </button>

                    <button
                        onClick={() => onVerify(password)}
                        className="px-4 py-2 bg-blue-600 rounded"
                    >
                        Verify
                    </button>
                </div>

            </div>
        </div>
    );
}