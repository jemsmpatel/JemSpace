import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useSelector } from 'react-redux';
import { apiRequest, setReauthHandler } from '../redux/api/apiSlice';
import toast from 'react-hot-toast';
import { Info as InfoIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    User, Mail, Shield, Calendar,
    Lock, Smartphone, MapPin,
    Clock, Activity, Edit
} from 'lucide-react';
import ReAuthModal from '../components/ReAuthModal';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { accessToken } = useSelector(state => state.auth);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [showTooltip, setShowTooltip] = useState(false);
    const [openReauth, setOpenReauth] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [openBackupModal, setOpenBackupModal] = useState(false);
    const [backupCodes, setBackupCodes] = useState([]);
    const [openPasswordModal, setOpenPasswordModal] = useState(false);

    const [form, setForm] = useState({
        name: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        newSecondaryPassword: '',
        confirmSecondaryPassword: ''
    });

    // 🔐 GLOBAL REAUTH
    useEffect(() => {
        setReauthHandler(() => {
            setOpenReauth(true);
        });
    }, []);

    // 🔄 FETCH
    const fetchProfile = async () => {
        try {
            const data = await apiRequest({
                url: '/auth/profile',
                token: accessToken
            });

            setUser(data);
            setForm(prev => ({ ...prev, name: data.name || '' }));

        } catch (err) {
            toast.error(err.message);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // 🔐 REAUTH
    const handleReauth = async (secondaryPassword) => {
        try {
            await apiRequest({
                url: '/auth/reauth',
                method: 'POST',
                token: accessToken,
                body: { secondaryPassword }
            });

            toast.success('Verified 🔓');
            setOpenReauth(false);

            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }

        } catch (err) {
            toast.error(err.message);
        }
    };

    // ✏️ UPDATE PROFILE
    const handleUpdateProfile = async () => {
        try {
            await apiRequest({
                url: '/auth/profile',
                method: 'PUT',
                token: accessToken,
                body: { name: form.name }
            });

            toast.success('Profile updated');
            fetchProfile();

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setPendingAction(() => handleUpdateProfile);
            } else {
                toast.error(err.message);
            }
        }
    };

    // 🔐 CHANGE PASSWORD (MODAL SUBMIT)
    const handleChangePassword = async () => {
        const {
            oldPassword,
            newPassword,
            confirmPassword,
            newSecondaryPassword,
            confirmSecondaryPassword
        } = form;

        if (!oldPassword) return toast.error("Old password required");

        if (newPassword && newPassword !== confirmPassword)
            return toast.error("Primary mismatch");

        if (newSecondaryPassword && newSecondaryPassword !== confirmSecondaryPassword)
            return toast.error("Secondary mismatch");

        if (newPassword && newPassword === newSecondaryPassword)
            return toast.error("Primary & Secondary cannot be same");

        try {
            await apiRequest({
                url: '/auth/change-password',
                method: 'PUT',
                token: accessToken,
                body: { oldPassword, newPassword, newSecondaryPassword }
            });

            toast.success('Password updated 🔐');
            setOpenPasswordModal(false);

            setForm(prev => ({
                ...prev,
                oldPassword: '',
                newPassword: '',
                confirmPassword: '',
                newSecondaryPassword: '',
                confirmSecondaryPassword: ''
            }));

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setPendingAction(() => handleChangePassword);
            } else {
                toast.error(err.message);
            }
        }
    };

    const handleToggleDevice = async (deviceId) => {
        try {
            await apiRequest({
                url: '/auth/toggle-device',
                method: 'POST',
                token: accessToken,
                body: { deviceId }
            });

            toast.success('Updated');
            fetchProfile();

        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleGenerateBackupCodes = async () => {
        try {
            const res = await apiRequest({
                url: '/auth/generate-backup-codes',
                method: 'POST',
                token: accessToken
            });

            const codes = res.codes; // direct codes array

            setBackupCodes(codes);       // modal ke liye state
            setOpenBackupModal(true);    // modal open
            toast.success('Backup codes generated ✅');

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setPendingAction(() => handleGenerateBackupCodes);
                setOpenReauth(true);
            } else {
                toast.error(err.message);
            }
        }
    };

    const handleCopyAll = () => {
        if (!backupCodes || backupCodes.length === 0) {
            return toast.error("No codes to copy ❌");
        }

        const text = backupCodes.join('\n');

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    toast.success("All codes copied ✔");
                })
                .catch(() => {
                    fallbackCopy(text);
                });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            toast.success("Copied ✔");
        } catch {
            toast.error("Copy failed ❌");
        }

        document.body.removeChild(textarea);
    };

    if (!user) return <p className="text-center mt-10 text-gray-400">Loading...</p>;

    const checkPassword = (password) => {
        return {
            length: password.length >= 8,
            lower: /[a-z]/.test(password),
            upper: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&]/.test(password)
        };
    };

    const passwordChecks = checkPassword(form.newPassword);

    return (
        <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-gray-800 text-white">

            <Header />

            <div className="max-w-6xl mx-auto p-4 md:p-6">

                <h1 className="text-2xl md:text-3xl font-bold mb-6">
                    👤 Account Center
                </h1>

                {/* TABS */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['profile', 'edit', 'security', 'activity'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg capitalize ${activeTab === tab ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* PROFILE */}
                {activeTab === 'profile' && (
                    <Card>
                        <Info icon={<User />} label="Name" value={user.name} />
                        <Info icon={<Mail />} label="Email" value={user.email} />
                        <Info icon={<Shield />} label="Status" value={user.isActive ? 'Active' : 'Disabled'} />
                        <Info icon={<Calendar />} label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
                    </Card>
                )}

                {/* EDIT */}
                {activeTab === 'edit' && (
                    <Card>
                        <h2 className="flex items-center gap-2">
                            <Edit /> Edit Profile
                        </h2>

                        {/* NAME */}
                        <input
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full p-3 rounded bg-gray-800 mt-3"
                        />

                        <button
                            onClick={handleUpdateProfile}
                            className="mt-4 bg-blue-600 px-4 py-2 rounded"
                        >
                            Save
                        </button>

                        {/* 🔥 DIVIDER */}
                        <div className="mt-6 border-t border-gray-700 pt-4" />

                        {/* 🔐 RECOVERY EMAIL */}
                        <div className="mt-3">
                            <h3 className="text-sm text-gray-400 mb-2">
                                Recovery Email
                            </h3>

                            <p className="text-xs text-gray-500 mb-3">
                                Update your email securely using verification
                            </p>

                            <button
                                onClick={() => navigate('/recover-account')}
                                className="bg-purple-600 px-4 py-2 rounded text-sm hover:opacity-90"
                            >
                                Update Email
                            </button>
                        </div>
                    </Card>
                )}

                {/* SECURITY */}
                {activeTab === 'security' && (
                    <Card>
                        <h2 className="flex items-center gap-2">
                            <Lock /> Security
                        </h2>

                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                            <Info icon={<Clock />} label="Last Login" value={new Date(user.lastLogin).toLocaleString()} />
                            <Info icon={<MapPin />} label="Location" value={user.lastLoginLocation} />
                            <Info icon={<Smartphone />} label="IP" value={user.lastLoginIP} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mt-6">
                            <button
                                onClick={() => setOpenPasswordModal(true)}
                                className="bg-blue-600 px-4 py-2 rounded"
                            >
                                Change Password
                            </button>

                            {/* 🔥 GENERATE BACKUP CODES BUTTON */}
                            <button
                                onClick={handleGenerateBackupCodes}
                                className="bg-purple-600 px-4 py-2 rounded"
                            >
                                Generate Backup Codes
                            </button>
                        </div>
                    </Card>
                )}

                {/* ACTIVITY */}
                {activeTab === 'activity' && (
                    <Card>
                        <h2 className="flex items-center gap-2">
                            <Activity /> Devices
                        </h2>

                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm text-left border border-gray-700 rounded-lg overflow-hidden">
                                <thead className="bg-gray-800 text-gray-300">
                                    <tr>
                                        <th className="p-3">Device</th>
                                        <th className="p-3">IP</th>
                                        <th className="p-3">Location</th>
                                        <th className="p-3">Last Used</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-center">Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {user.devices?.map((d, i) => {
                                        // 🔥 simple parsing
                                        const isChrome = d.userAgent.includes('Chrome');
                                        const isWindows = d.userAgent.includes('Windows');

                                        return (
                                            <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/50">

                                                {/* DEVICE */}
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {isChrome ? 'Chrome' : 'Browser'} / {isWindows ? 'Windows' : 'Device'}
                                                        </span>
                                                        <span className="text-xs text-gray-400 truncate max-w-50">
                                                            {d.userAgent}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* IP */}
                                                <td className="p-3">{d.ip}</td>

                                                {/* LOCATION */}
                                                <td className="p-3">{d.location || 'Unknown'}</td>

                                                {/* LAST USED */}
                                                <td className="p-3 text-gray-400">
                                                    {new Date(d.lastUsed).toLocaleString()}
                                                </td>

                                                {/* STATUS */}
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${d.isBlocked ? 'bg-red-600' : 'bg-green-600'
                                                        }`}>
                                                        {d.isBlocked ? 'Blocked' : 'Active'}
                                                    </span>
                                                </td>

                                                {/* ACTION */}
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleDevice(d._id)}
                                                        className={`px-3 py-1 rounded text-xs ${d.isBlocked ? 'bg-green-600' : 'bg-red-600'
                                                            }`}
                                                    >
                                                        {d.isBlocked ? 'Unblock' : 'Block'}
                                                    </button>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* 🔐 PASSWORD MODAL */}
            {openPasswordModal && (
                <Modal title="Change Password" onClose={() => setOpenPasswordModal(false)}>

                    <Input
                        type="password"
                        placeholder="Old Password"
                        onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                    />

                    {/* 🔥 NEW PASSWORD WITH TOOLTIP */}
                    <div className="relative overflow-visible">
                        <input
                            type="password"
                            placeholder="New Password"
                            className="w-full p-3 rounded bg-gray-800 pr-10"
                            onChange={e => setForm({ ...form, newPassword: e.target.value })}
                        />

                        <div
                            className="absolute right-3 top-3 cursor-pointer text-gray-400"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <InfoIcon size={18} />
                        </div>

                        {showTooltip && (
                            <div className="absolute right-0 top-12 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs z-999 shadow-xl">
                                <p className={passwordChecks.length ? "text-green-400" : "text-gray-400"}>✔ 8+ chars</p>
                                <p className={passwordChecks.upper ? "text-green-400" : "text-gray-400"}>✔ Uppercase</p>
                                <p className={passwordChecks.lower ? "text-green-400" : "text-gray-400"}>✔ Lowercase</p>
                                <p className={passwordChecks.number ? "text-green-400" : "text-gray-400"}>✔ Number</p>
                                <p className={passwordChecks.special ? "text-green-400" : "text-gray-400"}>✔ Special</p>
                            </div>
                        )}
                    </div>


                    <Input
                        type="password"
                        placeholder="Confirm Password"
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    />

                    <Input
                        type="password"
                        placeholder="Secondary Password"
                        onChange={e => setForm({ ...form, newSecondaryPassword: e.target.value })}
                    />

                    <Input
                        type="password"
                        placeholder="Confirm Secondary Password"
                        onChange={e => setForm({ ...form, confirmSecondaryPassword: e.target.value })}
                    />

                    <button
                        onClick={handleChangePassword}
                        className="bg-blue-600 px-4 py-2 rounded w-full"
                    >
                        Update Password
                    </button>

                </Modal>
            )}

            {/* 🔒 REAUTH */}
            {openReauth && (
                <ReAuthModal
                    onVerify={handleReauth}
                    onClose={() => setOpenReauth(false)}
                />
            )}

            {openBackupModal && (
                <Modal title="Your Backup Codes" onClose={() => setOpenBackupModal(false)}>
                    <p className="text-sm text-gray-400 mb-3">
                        Save these codes safely. Each code can be used once.
                    </p>
                    <p className="text-xs text-red-400 mt-2">
                        ⚠️ Save these codes. You won’t see them again.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, i) => (
                            <div
                                key={i}
                                className="bg-gray-800 text-center p-2 rounded cursor-pointer hover:bg-gray-700"
                                onClick={() => {
                                    navigator.clipboard.writeText(code);
                                    toast('Copied ✔', { icon: '📋' });
                                }}
                            >
                                {code}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleCopyAll}
                        className="mt-4 w-full bg-blue-600 py-2 rounded"
                    >
                        Copy All
                    </button>
                </Modal>
            )}
        </div>
    );
}

// COMPONENTS

function Card({ children }) {
    return (
        <motion.div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
            {children}
        </motion.div>
    );
}

function Info({ icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-blue-400">{icon}</div>
            <div>
                <p className="text-gray-400 text-sm">{label}</p>
                <p>{value}</p>
            </div>
        </div>
    );
}

function Modal({ children, title, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center px-4">
            <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md space-y-4 relative">
                <h2 className="text-lg font-semibold">{title}</h2>
                {children}
                <button onClick={onClose} className="text-sm text-gray-400">
                    Cancel
                </button>
            </div>
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className="w-full p-3 rounded bg-gray-800"
        />
    );
}