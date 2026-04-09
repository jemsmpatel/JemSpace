import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/features/authSlice';
import { apiRequest } from '../redux/api/apiSlice';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, Vault, StickyNote, HardDrive, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { accessToken } = useSelector(state => state.auth);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await apiRequest({
                url: '/auth/logout',
                method: 'POST',
                token: accessToken
            });
        } catch (err) {
            console.log(err.message);
        }

        dispatch(logout());
        navigate('/');
    };

    const navLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/vault', label: 'Vault', icon: Vault },
        { path: '/notes', label: 'Notes', icon: StickyNote },
        { path: '/storage', label: 'Storage', icon: HardDrive },
        { path: '/profile', label: 'Profile', icon: User },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <header className="bg-gray-900 text-white shadow-md">
            <div className="flex justify-between items-center px-4 py-3">

                {/* Logo */}
                <div
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 cursor-pointer"
                >
                    <img
                        src="/Secure shield with glowing padlock.png"
                        alt="logo"
                        className="w-10 h-10 object-contain drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]"
                    />
                    <span className="font-bold text-xl tracking-wide hidden sm:block">
                        Secure Vault
                    </span>
                </div>

                {/* Desktop Menu */}
                <nav className="hidden md:flex gap-6 items-center">
                    {navLinks.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`flex items-center gap-1 transition ${isActive(path)
                                ? 'text-blue-400 font-semibold'
                                : 'hover:text-blue-300'
                                }`}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    ))}

                    <button
                        onClick={handleLogout}
                        className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition"
                    >
                        Logout
                    </button>
                </nav>

                {/* Mobile Button */}
                <button
                    className="md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden px-4 pb-4 flex flex-col gap-4"
                    >
                        {navLinks.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center gap-2 ${isActive(path)
                                    ? 'text-blue-400 font-semibold'
                                    : ''
                                    }`}
                            >
                                <Icon size={18} />
                                {label}
                            </Link>
                        ))}

                        <button
                            onClick={handleLogout}
                            className="bg-red-600 px-3 py-2 rounded"
                        >
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}