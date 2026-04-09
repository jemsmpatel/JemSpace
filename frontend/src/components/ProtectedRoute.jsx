import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    const { accessToken, loading } = useSelector(state => state.auth);

    // 🔥 IMPORTANT
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    if (!accessToken) {
        return <Navigate to="/" />;
    }

    return children;
}