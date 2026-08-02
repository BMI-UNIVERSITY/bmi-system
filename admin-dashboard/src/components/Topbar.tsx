import React from 'react';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '8px' }}>{dateStr}</span>
        <button className="icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
        <div style={{
          padding: '4px 10px', background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.25)', borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--brand-bright)',
        }}>
          {user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'ADMIN'}
        </div>
      </div>
    </header>
  );
};
