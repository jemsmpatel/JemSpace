import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest, setReauthHandler } from '../redux/api/apiSlice';
import { Eye, Plus, Trash, Pencil, EyeOff, Search } from 'lucide-react';
import ReAuthModal from '../components/ReAuthModal';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import useIdleLock from '../hooks/useIdleLock';

export default function Vault() {
    const { accessToken } = useSelector(state => state.auth);

    const [vaults, setVaults] = useState([]);
    const [showId, setShowId] = useState(null);

    const [blurScreen, setBlurScreen] = useState(false);
    const [vaultTimer, setVaultTimer] = useState(null);

    const [search, setSearch] = useState('');

    const [openModal, setOpenModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [openReauth, setOpenReauth] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    const [form, setForm] = useState({
        name: '',
        password: '',
        note: ''
    });

    useIdleLock(() => {
        setShowId(null);
        toast('🔒 Vault auto locked');
    }, 10000); // 10 sec

    // 🔐 GLOBAL REAUTH
    useEffect(() => {
        setReauthHandler(() => {
            setOpenReauth(true);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (vaultTimer) clearTimeout(vaultTimer);
        };
    }, []);

    // 🔄 FETCH
    const fetchVaults = async () => {
        try {
            const data = await apiRequest({
                url: '/vault',
                token: accessToken
            });
            setVaults(data);
        } catch (err) {
            toast.error(err.message);
        }
    };

    useEffect(() => {
        fetchVaults();
    }, []);

    useEffect(() => {
        const handleBlur = () => setBlurScreen(true);
        const handleFocus = () => setBlurScreen(false);

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                setShowId(null);
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    useEffect(() => {
        const block = (e) => e.preventDefault();

        const blockKeys = (e) => {
            if (
                e.key === 'PrintScreen' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                toast('🚫 Blocked');
            }
        };

        document.addEventListener('contextmenu', block);
        document.addEventListener('keydown', blockKeys);

        return () => {
            document.removeEventListener('contextmenu', block);
            document.removeEventListener('keydown', blockKeys);
        };
    }, []);

    // 🔍 FILTER
    const filteredVaults = vaults.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.note?.toLowerCase().includes(search.toLowerCase())
    );

    // 👁️ SHOW PASSWORD
    const handleShowPassword = async (id) => {
        if (showId === id) {
            setShowId(null);
            if (vaultTimer) clearTimeout(vaultTimer);
            return;
        }

        if (vaultTimer) clearTimeout(vaultTimer);

        try {
            const data = await apiRequest({
                url: `/vault/${id}`,
                token: accessToken
            });

            setVaults(prev =>
                prev.map(v =>
                    v._id === id ? { ...v, password: data.password } : v
                )
            );

            setShowId(id);

            // ⏳ AUTO LOCK (10 sec)
            if (vaultTimer) clearTimeout(vaultTimer);

            const timer = setTimeout(() => {
                setShowId(null);
                toast('🔒 Hidden');
            }, 10000);

            setVaultTimer(timer);

        } catch (err) {
            toast.error(err.message);
        }
    };

    // ➕ CREATE
    const handleCreate = async () => {
        try {
            await apiRequest({
                url: '/vault',
                method: 'POST',
                token: accessToken,
                body: form
            });

            toast.success('Vault created');
            closeModal();
            fetchVaults();

        } catch (err) {
            toast.error(err.message);
        }
    };

    // ✏️ OPEN EDIT
    const openEdit = async (vault) => {
        try {
            const data = await apiRequest({
                url: `/vault/${vault._id}`,
                token: accessToken
            });

            setForm({
                name: data.name || '',
                password: data.password || '',
                note: data.note || ''
            });

            setSelectedId(vault._id);
            setEditMode(true);
            setOpenModal(true);

        } catch (err) {
            toast.error(err.message);
        }
    };

    // 🔥 UPDATE
    const handleUpdate = async () => {
        try {
            await apiRequest({
                url: `/vault/${selectedId}`,
                method: 'PUT',
                token: accessToken,
                body: {
                    name: form.name,
                    ...(form.password && { password: form.password }),
                    ...(form.note && { note: form.note })
                }
            });

            toast.success('Vault updated');
            closeModal();
            fetchVaults();

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setPendingAction(() => handleUpdate);
            } else {
                toast.error(err.message);
            }
        }
    };

    // 🗑️ DELETE
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure?');
        if (!confirmDelete) return;

        try {
            await apiRequest({
                url: `/vault/${id}`,
                method: 'DELETE',
                token: accessToken
            });

            toast.success('Vault deleted');
            fetchVaults();

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setSelectedId(id);
                setPendingAction(() => () => handleDelete(id));
            } else {
                toast.error(err.message);
            }
        }
    };

    // 🔐 REAUTH
    const handleReauth = async (secondaryPassword) => {
        try {
            await apiRequest({
                url: '/auth/reauth',
                method: 'POST',
                token: accessToken,
                body: { secondaryPassword }
            });

            toast.success('Verified');
            setOpenReauth(false);

            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }

        } catch (err) {
            toast.error(err.message);
        }
    };

    const closeModal = () => {
        setOpenModal(false);
        setEditMode(false);
        setForm({ name: '', password: '', note: '' });
        setShowPassword(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">

            <Header />

            <div className="max-w-5xl mx-auto p-6">

                {/* 🔍 SEARCH */}
                <div className="relative mb-6">
                    <input
                        placeholder="Search vault..."
                        className="w-full p-3 pl-10 bg-gray-800 rounded-lg"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                </div>

                {/* HEADER */}
                <div className="flex justify-between mb-6">
                    <h1 className="text-2xl font-bold">🔑 Vault Manager</h1>

                    <button
                        onClick={() => {
                            setEditMode(false);
                            setOpenModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>

                {/* LIST */}
                {filteredVaults.length === 0 ? (
                    <p className="text-gray-400 text-center mt-10">No vaults found</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {filteredVaults.map(v => (
                            <div key={v._id} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center hover:bg-gray-700">

                                <div>
                                    <p className="font-semibold">{v.name}</p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {showId === v._id ? v.password : '••••••••'}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => handleShowPassword(v._id)}>
                                        {showId === v._id ? <EyeOff /> : <Eye />}
                                    </button>

                                    <button onClick={() => openEdit(v)}>
                                        <Pencil />
                                    </button>

                                    <button onClick={() => handleDelete(v._id)}>
                                        <Trash />
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* MODAL */}
            {openModal && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center">

                    <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md space-y-4">

                        <h2 className="text-lg font-semibold">
                            {editMode ? 'Update Vault' : 'Create Vault'}
                        </h2>

                        <input
                            placeholder="Name"
                            className="w-full p-3 bg-gray-900 rounded"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                className="w-full p-3 pr-10 bg-gray-900 rounded"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <textarea
                            placeholder="Note"
                            className="w-full p-3 bg-gray-900 rounded"
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                        />

                        <div className="flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 bg-gray-600 rounded">
                                Cancel
                            </button>

                            <button
                                onClick={editMode ? handleUpdate : handleCreate}
                                className="px-4 py-2 bg-blue-600 rounded"
                            >
                                {editMode ? 'Update' : 'Save'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* 🔒 REAUTH */}
            {openReauth && (
                <ReAuthModal
                    onVerify={handleReauth}
                    onClose={() => setOpenReauth(false)}
                />
            )}

            {blurScreen && (
                <div className="fixed inset-0 backdrop-blur-xl bg-black/60 z-999 flex items-center justify-center">
                    <p className="text-white text-lg font-semibold">
                        🔒 Screen hidden
                    </p>
                </div>
            )}

        </div>
    );
}