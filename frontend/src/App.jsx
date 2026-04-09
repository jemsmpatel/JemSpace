import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Notes from './pages/Notes';
import Storage from './pages/Storage';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { refreshLogin } from './redux/features/authSlice';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import BackupLogin from './pages/BackupLogin';
import HelpPage from './pages/HelpPage';
import RecoverAccount from './pages/RecoverAccount';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshLogin());
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/login-backup" element={<BackupLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:id" element={<ResetPassword />} />
        <Route path="/help" element={<HelpPage />} />

        {/* 🔐 Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/vault" element={
          <ProtectedRoute>
            <Vault />
          </ProtectedRoute>
        } />

        <Route path="/notes" element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        } />

        <Route path="/storage" element={
          <ProtectedRoute>
            <Storage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/recover-account" element={
          <ProtectedRoute>
            <RecoverAccount />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;