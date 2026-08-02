import React from 'react';
import { useAuth } from '../context/AuthContext';

type Page =
  | 'overview'
  | 'admissions'
  | 'students'
  | 'courses'
  | 'grades'
  | 'finance'
  | 'hr-staff'
  | 'hr-leave'
  | 'library'
  | 'alumni'
  | 'campus'
  | 'notifications';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

// Role-based nav visibility
const ROLE_NAV_MAP: Record<string, Page[]> = {
  president:          ['overview', 'admissions', 'students', 'courses', 'grades', 'finance', 'hr-staff', 'hr-leave', 'library', 'alumni', 'campus', 'notifications'],
  it_admin:           ['overview', 'admissions', 'students', 'courses', 'grades', 'finance', 'hr-staff', 'hr-leave', 'library', 'alumni', 'campus', 'notifications'],
  registrar:          ['overview', 'students', 'courses', 'grades', 'notifications'],
  admissions_officer: ['overview', 'admissions', 'students', 'notifications'],
  finance_officer:    ['overview', 'finance', 'notifications'],
  exam_officer:       ['overview', 'grades', 'courses', 'notifications'],
  hr_manager:         ['overview', 'hr-staff', 'hr-leave', 'notifications'],
  lecturer:           ['overview', 'courses', 'grades', 'notifications'],
  librarian:          ['overview', 'library', 'notifications'],
  alumni_officer:     ['overview', 'alumni', 'notifications'],
};

const ALL_NAV_ITEMS: { id: Page; label: string; icon: string; section?: string }[] = [
  { id: 'overview',       label: 'Overview',        icon: '⬛', section: 'Main' },
  { id: 'admissions',     label: 'Admissions',      icon: '📥' },
  { id: 'students',       label: 'Students',        icon: '🎓' },
  { id: 'courses',        label: 'Courses',         icon: '📚', section: 'Academic' },
  { id: 'grades',         label: 'Grades',          icon: '📊' },
  { id: 'finance',        label: 'Finance & Fees',  icon: '💳', section: 'Administration' },
  { id: 'hr-staff',       label: 'Staff Records',   icon: '👥' },
  { id: 'hr-leave',       label: 'Leave Requests',  icon: '🗓️' },
  { id: 'library',        label: 'Library',         icon: '📖', section: 'Services' },
  { id: 'alumni',         label: 'Alumni',          icon: '🏛️' },
  { id: 'campus',         label: 'Campus Services', icon: '🏫' },
  { id: 'notifications',  label: 'Notifications',   icon: '🔔', section: 'System' },
];

const ROLE_LABELS: Record<string, string> = {
  president:          'President',
  it_admin:           'IT Admin',
  registrar:          'Registrar',
  admissions_officer: 'Admissions Officer',
  finance_officer:    'Finance Officer',
  exam_officer:       'Exam Officer',
  hr_manager:         'HR Manager',
  lecturer:           'Lecturer',
  librarian:          'Librarian',
  alumni_officer:     'Alumni Officer',
};

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { user, logout } = useAuth();
  const role = user?.role ?? 'registrar';
  const allowedPages = ROLE_NAV_MAP[role] ?? ROLE_NAV_MAP['registrar'];

  const visibleItems = ALL_NAV_ITEMS.filter((item) => allowedPages.includes(item.id));
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'AD';

  let currentSection = '';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">BMI</div>
        <div className="sidebar-logo-text">
          <strong>BMI Admin</strong>
          <span>Management Portal</span>
        </div>
      </div>

      {/* Role badge */}
      <div className="role-badge">{ROLE_LABELS[role] ?? role}</div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const showSection = item.section && item.section !== currentSection;
          if (item.section) currentSection = item.section;
          return (
            <React.Fragment key={item.id}>
              {showSection && <div className="nav-section-label">{item.section}</div>}
              <button
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name ?? 'Admin'}</div>
            <div className="user-role">{user?.email ?? ''}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
          >↩</button>
        </div>
      </div>
    </aside>
  );
};

export type { Page };
