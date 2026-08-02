import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { AuditLogModal } from './components/common/AuditLogModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { LoginModal } from './components/common/LoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

const StaffProtectedRoute: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { authToken, authUser } = useApp();

  const isStaffAuthenticated = Boolean(authToken && authUser && authUser.role !== 'student');

  if (!isStaffAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Staff & Faculty Authorization Required</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Access to the BMI UMS Staff Console is restricted to authenticated staff, faculty, and administrative officers with active Bearer credentials.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-4">
          <button
            onClick={onOpenLogin}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticate Staff Credentials</span>
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
};

const MainLayout: React.FC = () => {
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Header
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Primary Client-Side Router View */}
      <main>
        <Routes>
          <Route path="/" element={<StaffProtectedRoute onOpenLogin={() => setIsLoginOpen(true)} />} />
          <Route path="/staff/*" element={<StaffProtectedRoute onOpenLogin={() => setIsLoginOpen(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
