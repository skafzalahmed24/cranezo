import React, { useState } from 'react';
import { apiRequest } from '../../utils/api';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Settings,
  KeyRound,
} from 'lucide-react';

export const Header = ({
  activeView,
  userSession,
  onLogout,
  onNavigate,
  theme,
  onToggleTheme,
  onToggleMobileSidebar,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pw, setPw] = useState(null); // null = closed, otherwise the form
  const savePassword = async () => {
    if (pw.next !== pw.again) return setPw({ ...pw, error: 'The two new passwords are not the same.', ok: '' });
    setPw({ ...pw, busy: true, error: '', ok: '' });
    try {
      await apiRequest('/admin/change-password', { method: 'POST', body: { current_password: pw.current, new_password: pw.next } });
      setPw({ current: '', next: '', again: '', busy: false, error: '', ok: 'Password changed. Use the new password the next time you sign in.' });
    } catch (e) {
      setPw({ ...pw, busy: false, error: e.message, ok: '' });
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard';
      case 'users':
        return 'Users';
      case 'user-details':
        return 'User Details';
      case 'owners':
        return 'Owners Management';
      case 'operators':
        return 'Operators Management';
      case 'crane-approvals':
        return 'Crane Approvals';
      case 'cranes':
        return 'Crane Fleet';
      case 'bookings':
        return 'Bookings';
      case 'payments':
        return 'Payments';
      case 'reviews':
        return 'Customer Reviews';
      case 'reports':
        return 'Reports & Analytics';
      case 'notifications':
        return 'System Notifications';
      case 'legal':
        return 'Legal Pages';
      case 'banners':
        return 'Banners';
      case 'support':
        return 'Support';
      case 'announcements':
        return 'Announcements';
      case 'settings':
        return 'System Settings';
      default:
        return 'Dashboard';
    }
  };

  const getSearchPlaceholder = () => {
    if (activeView === 'users' || activeView === 'user-details') {
      return 'Search units, bookings, operators...';
    }
    return 'Search here...';
  };

  return (
    <header className="cranezo-top-header">
      <div className="cranezo-header-left">
        <button
          type="button"
          className="cranezo-hamburger-btn"
          onClick={onToggleMobileSidebar}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="cranezo-header-title">{getTitle()}</h1>
      </div>

      <div className="cranezo-header-right">
        <div className="cranezo-header-search">
          <Search size={16} className="cranezo-header-search-icon" />
          <input
            type="text"
            className="cranezo-header-search-input"
            placeholder={getSearchPlaceholder()}
          />
        </div>

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          type="button"
          className="cranezo-icon-button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
        </button>

        {/* Notifications Button */}
        <button
          type="button"
          className="cranezo-icon-button"
          title="Notifications"
          onClick={() => onNavigate('notifications')}
        >
          <Bell size={18} />
          <span className="cranezo-notification-badge" />
        </button>

        {/* Profile Pill & Menu */}
        <div style={{ position: 'relative' }}>
          <div
            className="cranezo-user-pill"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            <div className="cranezo-user-avatar">
              {userSession?.name?.slice(0, 1) || 'A'}
            </div>
            <div className="cranezo-user-meta">
              <span className="cranezo-user-name">
                {userSession?.name || 'Admin'}
              </span>
              <span className="cranezo-user-role">
                {userSession?.role || 'Super Admin'}
              </span>
            </div>
            <ChevronDown size={14} color="var(--dash-text-muted)" />
          </div>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '210px',
                background: 'var(--dash-card)',
                border: '1px solid var(--dash-border)',
                borderRadius: '10px',
                boxShadow: 'var(--dash-shadow)',
                padding: '6px',
                zIndex: 70,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--dash-border-subtle)',
                  marginBottom: '4px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-title)' }}>
                  {userSession?.email || 'superadmin@cranezo.com'}
                </div>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
                  {userSession?.access_role ? userSession.access_role.toUpperCase() : 'HQ CONTROL'}
                </div>
              </div>
              <button
                type="button"
                className="cranezo-nav-item"
                style={{ padding: '8px 10px' }}
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate('settings');
                }}
              >
                <Settings size={15} />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                className="cranezo-nav-item"
                style={{ padding: '8px 10px' }}
                onClick={() => {
                  setShowProfileMenu(false);
                  setPw({ current: '', next: '', again: '', busy: false, error: '', ok: '' });
                }}
              >
                <KeyRound size={15} />
                <span>Change Password</span>
              </button>
              <button
                type="button"
                className="cranezo-nav-item"
                style={{ padding: '8px 10px' }}
                onClick={() => {
                  onToggleTheme();
                  setShowProfileMenu(false);
                }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
              <button
                type="button"
                className="cranezo-nav-item cranezo-nav-item-logout"
                style={{ padding: '8px 10px' }}
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {pw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 16 }} onClick={() => setPw(null)}>
          <div className="cranezo-card" style={{ width: 'min(420px, 100%)', padding: 22 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="cranezo-card-title" style={{ margin: '0 0 6px' }}>Change password</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--dash-text-muted)' }}>At least 8 characters, with letters and numbers.</p>
            {pw.error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{pw.error}</div>}
            {pw.ok && <div style={{ color: '#22c55e', fontSize: 13, marginBottom: 10 }}>{pw.ok}</div>}
            {[['current', 'Current password'], ['next', 'New password'], ['again', 'New password again']].map(([k, label]) => (
              <label key={k} style={{ display: 'block', fontSize: 12, color: 'var(--dash-text-subtle)', margin: '0 0 10px' }}>
                {label}
                <input
                  type="password"
                  autoComplete={k === 'current' ? 'current-password' : 'new-password'}
                  value={pw[k]}
                  onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, background: 'var(--dash-input-bg)', border: '1px solid var(--dash-input-border)', borderRadius: 8, color: 'var(--dash-text-body)', padding: '9px 12px', fontSize: 13 }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="cranezo-btn-primary-amber" disabled={pw.busy || !pw.current || !pw.next} onClick={savePassword}>{pw.busy ? 'Saving…' : 'Save password'}</button>
              <button type="button" className="cranezo-btn-secondary" onClick={() => setPw(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
