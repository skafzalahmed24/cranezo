import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardOverview from './DashboardOverview';
import UsersList from './UsersList';
import UserDetails from './UserDetails';
import OwnersList from './OwnersList';
import OwnerDetails from './OwnerDetails';
import OperatorsList from './OperatorsList';
import OperatorDetails from './OperatorDetails';
import CranesList from './CranesList';
import CraneDetails from './CraneDetails';
import CraneApprovals from './CraneApprovals';
import SettingsDropdowns from './SettingsDropdowns';
import BookingsList from './BookingsList';
import CraneMatching from './CraneMatching';
import AddUserModal from './AddUserModal';
import AddCraneModal from './AddCraneModal';
import { apiRequest } from '../../utils/api';
import '../../styles/dashboard.css';

export const DashboardLayout = ({ userSession, onLogout }) => {
  const [activeView, setActiveView] = useState('cranes'); // Default to cranes as requested
  const [selectedUserId, setSelectedUserId] = useState('USR-10245');
  const [selectedOwnerId, setSelectedOwnerId] = useState('OWN-1001');
  const [selectedOperatorId, setSelectedOperatorId] = useState('OPR-1003');
  const [selectedCraneId, setSelectedCraneId] = useState('CRN-1045');
  const [selectedBookingId, setSelectedBookingId] = useState('CRZ10245');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddCraneModalOpen, setIsAddCraneModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Crane approvals waiting for review, shown as a badge in the sidebar
  const [pendingCranes, setPendingCranes] = useState(0);

  const refreshPendingCranes = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/cranes/summary', { method: 'POST' });
      setPendingCranes(res.data.under_review);
    } catch (e) {
      // badge is cosmetic; ignore when the API is unreachable or not signed in
    }
  }, []);

  useEffect(() => {
    refreshPendingCranes();
  }, [activeView, refreshPendingCranes]);

  useEffect(() => {
    const timer = setInterval(refreshPendingCranes, 60000);
    return () => clearInterval(timer);
  }, [refreshPendingCranes]);

  // Custom added users state persisted to localStorage
  const [customUsers, setCustomUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('cranzo_custom_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleUserAdded = (newUser) => {
    const updated = [newUser, ...customUsers];
    setCustomUsers(updated);
    try {
      localStorage.setItem('cranzo_custom_users', JSON.stringify(updated));
    } catch (e) {}
    setActiveView('users');
  };

  const handleCraneAdded = (newCrane) => {
    setActiveView('cranes');
  };

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

  const handleSelectOwner = (ownerId) => {
    setSelectedOwnerId(ownerId || 'OWN-1001');
    setActiveView('owner-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToOwners = () => {
    setActiveView('owners');
  };

  const handleSelectOperator = (operatorId) => {
    setSelectedOperatorId(operatorId || 'OPR-1003');
    setActiveView('operator-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToOperators = () => {
    setActiveView('operators');
  };

  const handleSelectCrane = (craneId) => {
    setSelectedCraneId(craneId || 'CRN-1045');
    setActiveView('crane-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToCranes = () => {
    setActiveView('cranes');
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId || 'CRZ10245');
    setActiveView('crane-matching');
    setMobileSidebarOpen(false);
  };

  const handleBackToBookings = () => {
    setActiveView('bookings');
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
        badges={{ 'crane-approvals': pendingCranes }}
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
              customUsers={customUsers}
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

          {activeView === 'owners' && (
            <OwnersList onSelectOwner={handleSelectOwner} />
          )}

          {activeView === 'owner-details' && (
            <OwnerDetails
              ownerId={selectedOwnerId}
              onBack={handleBackToOwners}
            />
          )}

          {activeView === 'operators' && (
            <OperatorsList onSelectOperator={handleSelectOperator} />
          )}

          {activeView === 'operator-details' && (
            <OperatorDetails
              operatorId={selectedOperatorId}
              onBack={handleBackToOperators}
            />
          )}

          {activeView === 'cranes' && (
            <CranesList
              onSelectCrane={handleSelectCrane}
              onAddCrane={() => setIsAddCraneModalOpen(true)}
            />
          )}

          {activeView === 'crane-details' && (
            <CraneDetails
              craneId={selectedCraneId}
              onBack={handleBackToCranes}
              onNavigateToBookings={() => setActiveView('bookings')}
            />
          )}

          {activeView === 'bookings' && (
            <BookingsList onSelectBooking={handleSelectBooking} />
          )}

          {activeView === 'crane-matching' && (
            <CraneMatching
              bookingId={selectedBookingId}
              onBack={handleBackToBookings}
              onSelectCraneDetails={handleSelectCrane}
            />
          )}

          {activeView === 'crane-approvals' && <CraneApprovals onReviewed={refreshPendingCranes} />}

          {activeView === 'settings' && <SettingsDropdowns />}

          {/* Placeholders for other subpages while keeping navigation active */}
          {![
            'dashboard',
            'users',
            'user-details',
            'owners',
            'owner-details',
            'operators',
            'operator-details',
            'cranes',
            'crane-details',
            'bookings',
            'crane-matching',
            'crane-approvals',
            'settings',
          ].includes(activeView) && (
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
        onUserAdded={handleUserAdded}
      />

      {/* Add Crane Modal */}
      <AddCraneModal
        isOpen={isAddCraneModalOpen}
        onClose={() => setIsAddCraneModalOpen(false)}
        onCraneAdded={handleCraneAdded}
      />
    </div>
  );
};

export default DashboardLayout;
