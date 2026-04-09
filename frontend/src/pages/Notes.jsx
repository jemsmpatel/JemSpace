import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest, setReauthHandler } from '../redux/api/apiSlice';
import { Plus, Trash, Pencil, Search, Eye } from 'lucide-react';
import ReAuthModal from '../components/ReAuthModal';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import useIdleLock from '../hooks/useIdleLock';

export default function Notes() {
    const { accessToken } = useSelector(state => state.auth);
    const [blurScreen, setBlurScreen] = useState(false);
    const [noteTimer, setNoteTimer] = useState(null);
    const [search, setSearch] = useState('');
    const [notes, setNotes] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewNote, setViewNote] = useState(null);
    const [openReauth, setOpenReauth] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    const [form, setForm] = useState({
        title: '',
        content: ''
    });

    // 🔐 GLOBAL REAUTH
    useEffect(() => {
        setReauthHandler(() => {
            setOpenReauth(true);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (noteTimer) clearTimeout(noteTimer);
        };
    }, [noteTimer]);

    useIdleLock(() => {
        setViewNote(null);
        toast('🔒 Auto locked (idle)');
    }, 30000); // 30 sec

    // 🔄 FETCH NOTES
    const fetchNotes = async () => {
        try {
            const data = await apiRequest({
                url: '/notes',
                token: accessToken
            });
            setNotes(data);
        } catch (err) {
            toast.error(err.message);
        }
    };

    useEffect(() => {
        fetchNotes();
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
                setViewNote(null);
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

    // 🔍 FILTER NOTES
    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase())
    );

    // ➕ CREATE
    const handleCreate = async () => {
        try {
            await apiRequest({
                url: '/notes',
                method: 'POST',
                token: accessToken,
                body: form
            });

            toast.success('Note created');
            closeModal();
            fetchNotes();

        } catch (err) {
            toast.error(err.message);
        }
    };

    // ✏️ OPEN EDIT
    const openEdit = async (note) => {
        try {
            const data = await apiRequest({
                url: `/notes/${note._id}`,
                token: accessToken
            });

            setForm({
                title: data.title || '',
                content: data.content || ''
            });

            setSelectedId(note._id);
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
                url: `/notes/${selectedId}`,
                method: 'PUT',
                token: accessToken,
                body: form
            });

            toast.success('Note updated');
            closeModal();
            fetchNotes();

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
        const confirmDelete = window.confirm('Delete this note?');
        if (!confirmDelete) return;

        try {
            await apiRequest({
                url: `/notes/${id}`,
                method: 'DELETE',
                token: accessToken
            });

            toast.success('Note deleted');
            fetchNotes();

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
        setForm({ title: '', content: '' });
    };

    const handleViewNote = async (id) => {
        try {
            const data = await apiRequest({
                url: `/notes/${id}`,
                token: accessToken
            });

            setViewNote(data);

            // ⏳ AUTO LOCK (30 sec)
            if (noteTimer) clearTimeout(noteTimer);

            const timer = setTimeout(() => {
                setViewNote(null);
                toast('🔒 Note locked');
            }, 30000);

            setNoteTimer(timer);

        } catch (err) {
            if (err.message === 'ReAuth Required') {
                setSelectedId(id);
                setPendingAction(() => () => handleViewNote(id));
            } else {
                toast.error(err.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">

            <Header />

            <div className="max-w-5xl mx-auto p-6">

                {/* 🔍 SEARCH */}
                <div className="relative mb-6">
                    <input
                        placeholder="Search notes..."
                        className="w-full p-3 pl-10 bg-gray-800 rounded-lg outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                </div>

                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">📄 Secure Notes</h1>

                    <button
                        onClick={() => {
                            setEditMode(false);
                            setOpenModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
                    >
                        <Plus size={18} /> Add Note
                    </button>
                </div>

                {/* LIST */}
                {filteredNotes.length === 0 ? (
                    <p className="text-gray-400 text-center mt-10">No notes found</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {filteredNotes.map(n => (
                            <div key={n._id} className="bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition">

                                <div className="flex justify-between items-start">

                                    <div>
                                        <p className="font-semibold text-lg">{n.title}</p>

                                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                                            Click eye to view securely 🔐
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => handleViewNote(n._id)}>
                                            <Eye size={18} />
                                        </button>

                                        <button onClick={() => openEdit(n)}>
                                            <Pencil size={18} />
                                        </button>

                                        <button onClick={() => handleDelete(n._id)}>
                                            <Trash size={18} />
                                        </button>
                                    </div>

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
                            {editMode ? 'Update Note' : 'Create Note'}
                        </h2>

                        <input
                            placeholder="Title"
                            className="w-full p-3 bg-gray-900 rounded"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                        />

                        <textarea
                            placeholder="Content"
                            className="w-full p-3 bg-gray-900 rounded h-32"
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-gray-600 rounded"
                            >
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

            {/* 👁️ VIEW NOTE MODAL */}
            {viewNote && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">

                    <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg space-y-4">

                        <h2 className="text-xl font-bold">{viewNote.title}</h2>

                        <div className="bg-gray-900 p-4 rounded max-h-80 overflow-y-auto">
                            <p className="text-gray-300 whitespace-pre-wrap">
                                {viewNote.content}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setViewNote(null);
                                    if (noteTimer) clearTimeout(noteTimer);
                                }}
                                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {blurScreen && (
                <div className="fixed inset-0 backdrop-blur-xl bg-black/60 z-999 flex items-center justify-center">
                    <p className="text-white text-lg font-semibold">
                        🔒 Screen hidden for security
                    </p>
                </div>
            )}
        </div>
    );
}