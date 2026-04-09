import Header from '../components/Header';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">

            <Header />

            <div className="p-6">

                <h1 className="text-3xl mb-8 font-bold">🔐 Dashboard</h1>

                <div className="grid gap-6 md:grid-cols-3">

                    <Link to="/vault" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700">
                        🔑 Vault Manager
                    </Link>

                    <Link to="/notes" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700">
                        📄 Secure Notes
                    </Link>

                    <Link to="/storage" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700">
                        ☁️ Cloud Storage
                    </Link>

                </div>

            </div>
        </div>
    );
}