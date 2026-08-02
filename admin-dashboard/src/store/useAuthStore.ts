import { create } from 'zustand';
import { UserRole } from '../types';

interface AuthState {
  authToken: string | null;
  authUser: { name: string; role: UserRole } | null;
  activeRole: UserRole;
  currentPortal: 'student' | 'staff';
  activeStudentId: string;

  setAuth: (token: string | null, user: { name: string; role: UserRole } | null) => void;
  logout: () => void;
  setActiveRole: (role: UserRole) => void;
  setCurrentPortal: (portal: 'student' | 'staff') => void;
  setActiveStudentId: (id: string) => void;
}

const getInitialToken = (): string | null => {
  return sessionStorage.getItem('bmi_ums_auth_token');
};

const getInitialUser = (): { name: string; role: UserRole } | null => {
  const saved = sessionStorage.getItem('bmi_ums_auth_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    sessionStorage.removeItem('bmi_ums_auth_user');
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  authToken: getInitialToken(),
  authUser: getInitialUser(),
  activeRole: (getInitialUser()?.role as UserRole) || 'president',
  currentPortal: 'staff',
  activeStudentId: 'std-101',

  setAuth: (token, user) => {
    if (token) {
      sessionStorage.setItem('bmi_ums_auth_token', token);
    } else {
      sessionStorage.removeItem('bmi_ums_auth_token');
    }

    if (user) {
      sessionStorage.setItem('bmi_ums_auth_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('bmi_ums_auth_user');
    }

    set({
      authToken: token,
      authUser: user,
      activeRole: user?.role || 'president',
      currentPortal: user?.role === 'student' ? 'student' : 'staff',
    });
  },

  logout: () => {
    sessionStorage.removeItem('bmi_ums_auth_token');
    sessionStorage.removeItem('bmi_ums_auth_user');
    set({
      authToken: null,
      authUser: null,
      activeRole: 'student',
      currentPortal: 'student',
    });
  },

  setActiveRole: (role) => set({ activeRole: role, currentPortal: role === 'student' ? 'student' : 'staff' }),
  setCurrentPortal: (portal) => set({ currentPortal: portal }),
  setActiveStudentId: (id) => set({ activeStudentId: id }),
}));
