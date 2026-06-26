/* eslint-disable */
/* eslint-disable */
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import Sidebar from "./components/Sidebar";
import AIModal from "./components/AIModal";
import NotificationCenter from "./components/NotificationCenter";
import Login from "./components/Login";
import VerificationPage from "./components/VerificationPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import SessionTimeoutWarning from "./components/SessionTimeoutWarning";
import { AppRoutes } from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuthStore } from "./stores/authStore";
import { useDataStore } from "./stores/dataStore";
import { useUIStore } from "./stores/uiStore";
import { useRealtimeSync } from "./hooks/useRealtime";

/** Public routes (no auth required) */
function PublicRoutes() {
  const { logo } = useUIStore();
  return (
    <Routes>
      <Route path="/verify" element={<VerificationPage logo={logo} />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="*"
        element={
          <Login
            onLogin={() => useAuthStore.getState().checkSession()}
            logo={logo}
          />
        }
      />
    </Routes>
  );
}

/** Authenticated app layout with sidebar + main content */
function AuthenticatedLayout() {
  const { logout: authLogout } = useAuthStore();
  const { fetchAllCoreData, clearAll } = useDataStore();
  const {
    theme,
    logo,
    isSidebarOpen,
    isAIModalOpen,
    isNotificationCenterOpen,
    closeSidebar,
    openSidebar,
    closeAIModal,
    openNotificationCenter,
    closeNotificationCenter,
  } = useUIStore();

  // Activate real-time synchronization
  useRealtimeSync();

  // Data freshness is now managed by TanStack Query (staleTime + refetchOnWindowFocus).
  // See src/hooks/useEntityQueries.ts. Components that need paginated data should use
  // useStudentsQuery(), useStaffQuery(), etc. directly instead of the global store.
  // The initial fetchAllCoreData() call on login (in the App component) still populates
  // the Zustand store for components not yet migrated to React Query.

  // Handle Theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="flex bg-[#F8F9FA] dark:bg-[#0a0015] h-screen font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Drawer Trigger Button */}
      <button
        onClick={openSidebar}
        className={`fixed top-3 left-4 z-50 p-2 bg-[#4B0082] text-white rounded-full shadow-lg hover:scale-110 transition-all border-2 border-[#FFD700] ${isSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Open Menu"
      >
        <Menu size={20} />
      </button>

      {/* Notification Bell */}
      <button
        onClick={openNotificationCenter}
        className={`fixed top-3 right-4 z-50 p-2 bg-white dark:bg-gray-800 text-[#4B0082] dark:text-[#FFD700] rounded-full shadow-lg hover:scale-110 transition-all border-2 border-[#4B0082] dark:border-[#FFD700]`}
        aria-label="Notifications"
      >
        <Bell size={20} />
      </button>

      <Sidebar
        currentView={window.location.pathname.slice(1) || "dashboard"}
        onChangeView={() => {
          /* Navigation handled by Sidebar using useNavigate */
        }}
        onLogout={async () => {
          await authLogout();
          clearAll();
        }}
        logo={logo}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 w-full p-2 md:p-4 lg:p-6 h-full overflow-hidden box-border">
        <main className="h-full rounded-3xl bg-white/50 dark:bg-black/10 border border-white/20 dark:border-gray-800 shadow-sm relative backdrop-blur-sm overflow-y-auto no-scrollbar flex flex-col">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>

      <AIModal isOpen={isAIModalOpen} onClose={closeAIModal} />
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={closeNotificationCenter}
      />

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        onSessionExpired={() => {
          useAuthStore.getState().logout();
          useDataStore.getState().clearAll();
        }}
      />
    </div>
  );
}

function App() {
  const { isLoggedIn, isAuthenticating, checkSession } = useAuthStore();
  const { logo } = useUIStore();

  // Session verification on mount
  useEffect(() => {
    // Clean up stale PII / mock caches from previous versions
    localStorage.removeItem("bmi_data_students");
    localStorage.removeItem("bmi_data_staff");
    localStorage.removeItem("bmi_data_transactions");
    localStorage.removeItem("bmi_data_courses");
    localStorage.removeItem("bmi_data_library");

    // Purge old-format transcript documents from localStorage.
    // Old entries used the ?s=&h=&t=&v=2 URL scheme and only verified
    // on the issuing browser.  The new scheme registers server-side
    // so QR codes work on any device.  We detect old entries by
    // checking for the presence of ?s= in their verificationUrl.
    try {
      const raw = localStorage.getItem("bmi_documents");
      if (raw) {
        const docs = JSON.parse(raw) as Array<{
          type: string;
          security?: { verificationUrl?: string };
        }>;
        const fresh = docs.filter(
          (d) =>
            d.type !== "transcript" ||
            // Keep only server-registered transcripts (?id= scheme)
            (d.security?.verificationUrl?.includes("?id=") ?? false),
        );
        if (fresh.length !== docs.length) {
          localStorage.setItem("bmi_documents", JSON.stringify(fresh));
          console.info(
            `[App] Purged ${docs.length - fresh.length} legacy transcript record(s) from localStorage.`,
          );
        }
      }
    } catch (error) {
      // If parsing fails, remove the entire key so we start clean
      localStorage.removeItem("bmi_documents");
    }
  }, []);

  // Fetch core data on login is now managed by TanStack Query in each component.
  // We only keep checkSession here.
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Authenticating spinner
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#4B0082] to-[#320064] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-xl border-2 border-[#FFD700] bg-white p-2 shadow-2xl animate-pulse">
            <img src={logo} alt="BMI University" className="w-full h-full object-contain" />
          </div>
          <div className="w-10 h-10 border-4 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-[#FFD700] font-semibold text-lg">
              BMI University ERP
            </p>
            <p className="text-white/60 text-sm mt-1">
              Loading system modules...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <PublicRoutes />;
  }

  return <AuthenticatedLayout />;
}

export default App;









