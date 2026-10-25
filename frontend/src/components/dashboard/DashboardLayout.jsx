import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardOverview from './DashboardOverview';
import UsersList from './UsersList';
import UserDetails from './UserDetails';
import AddUserModal from './AddUserModal';
import '../../styles/dashboard.css';

export const DashboardLayout = ({ userSession, onLogout }) => {
  const [activeView, setActiveView] = useState('users'); // defaulted to users or dashboard
  const [selectedUserId, setSelectedUserId] = useState('USR-10245');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Theme state: defaults to dark or saved preference
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('cranzo_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('cranzo_theme', nextTheme);
    } catch (e) {
      // ignore
    }
  };

  const handleNavigate = (viewId) => {
    setActiveView(viewId);
    setMobileSidebarOpen(false);
  };

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId || 'USR-10245');
    setActiveView('user-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToUsers = () => {
    setActiveView('users');
  };

  return (
    <div className="cranzo-admin-layout" data-theme={theme}>
      {/* Mobile Drawer Overlay */}
      <div
        className={`cranzo-sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Fixed Left Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area (offset by fixed sidebar) */}
      <div className="cranzo-main-wrapper">
        <Header
          activeView={activeView}
          userSession={userSession}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main style={{ flex: 1, width: '100%', boxSizing: 'border-box' }}>
          {activeView === 'dashboard' && (
            <DashboardOverview
              onNavigate={handleNavigate}
              onSelectUser={handleSelectUser}
            />
          )}

          {activeView === 'users' && (
            <UsersList
              onSelectUser={handleSelectUser}
              onAddUserClick={() => setIsAddUserModalOpen(true)}
            />
          )}

          {activeView === 'user-details' && (
            <UserDetails
              userId={selectedUserId}
              onBack={handleBackToUsers}
            />
          )}

          {/* Placeholders for other subpages while keeping navigation active */}
          {!['dashboard', 'users', 'user-details'].includes(activeView) && (
            <div className="cranzo-content-view animate-fade-in">
              <div className="cranzo-card" style={{ padding: '40px', textAlign: 'center' }}>
                <h3 className="cranzo-card-title" style={{ fontSize: '20px', textTransform: 'capitalize' }}>
                  {activeView} Module
                </h3>
                <p className="cranzo-card-subtitle" style={{ marginTop: '8px', fontSize: '14px' }}>
                  This section is being synchronized with the fleet control network.
                </p>
                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="cranzo-btn-primary-amber"
                    onClick={() => setActiveView('dashboard')}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={() => {
          setActiveView('users');
        }}
      />
    </div>
  );
};

export default DashboardLayout;
