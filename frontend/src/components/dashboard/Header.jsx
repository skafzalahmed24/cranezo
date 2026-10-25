import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Settings,
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
    <header className="cranzo-top-header">
      <div className="cranzo-header-left">
        <button
          type="button"
          className="cranzo-hamburger-btn"
          onClick={onToggleMobileSidebar}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="cranzo-header-title">{getTitle()}</h1>
      </div>

      <div className="cranzo-header-right">
        <div className="cranzo-header-search">
          <Search size={16} className="cranzo-header-search-icon" />
          <input
            type="text"
            className="cranzo-header-search-input"
            placeholder={getSearchPlaceholder()}
          />
        </div>

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          type="button"
          className="cranzo-icon-button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
        </button>

        {/* Notifications Button */}
        <button
          type="button"
          className="cranzo-icon-button"
          title="Notifications"
          onClick={() => onNavigate('notifications')}
        >
          <Bell size={18} />
          <span className="cranzo-notification-badge" />
        </button>

        {/* Profile Pill & Menu */}
        <div style={{ position: 'relative' }}>
          <div
            className="cranzo-user-pill"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            <div className="cranzo-user-avatar">
              {userSession?.name?.slice(0, 1) || 'A'}
            </div>
            <div className="cranzo-user-meta">
              <span className="cranzo-user-name">
                {userSession?.name || 'Admin'}
              </span>
              <span className="cranzo-user-role">
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
                  {userSession?.email || 'superadmin@cranzo.com'}
                </div>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
                  HQ CONTROL
                </div>
              </div>
              <button
                type="button"
                className="cranzo-nav-item"
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
                className="cranzo-nav-item"
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
                className="cranzo-nav-item cranzo-nav-item-logout"
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
    </header>
  );
};

export default Header;
