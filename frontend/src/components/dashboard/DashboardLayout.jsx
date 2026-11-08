import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AdminDashboard from './AdminDashboard';
import AdminBookings from './AdminBookings';
import AdminReviews from './AdminReviews';
import AdminReports from './AdminReports';
import AdminAlerts from './AdminAlerts';
import UserDetails from './UserDetails';
import CraneDetails from './CraneDetails';
import CraneApprovals from './CraneApprovals';
import DirectoryList from './DirectoryList';
import MemberDetails from './MemberDetails';
import CraneDetailsLive from './CraneDetailsLive';
import SettingsDropdowns from './SettingsDropdowns';
import LegalPagesEditor from './LegalPagesEditor';
import SupportCenter from './SupportCenter';
import Announcements from './Announcements';
import Banners from './Banners';
import Payments from './Payments';
import Settlements from './Settlements';
import Complaints from './Complaints';
import PlatformFee from './PlatformFee';
import CraneRequests from './CraneRequests';
import PricingRules from './PricingRules';
import AppVersions from './AppVersions';
import AddUserModal from './AddUserModal';
import AddCraneModal from './AddCraneModal';
import { apiRequest } from '../../utils/api';
import '../../styles/dashboard.css';

export const DashboardLayout = ({ userSession, onLogout }) => {
  const [activeView, setActiveView] = useState('cranes'); // Default to cranes as requested
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [selectedCraneId, setSelectedCraneId] = useState(null);
  // where the Back button of a details screen returns to
  const [memberBack, setMemberBack] = useState('users');
  const [craneBack, setCraneBack] = useState('cranes');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddCraneModalOpen, setIsAddCraneModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Crane approvals waiting for review, shown as a badge in the sidebar
  const [pendingCranes, setPendingCranes] = useState(0);
  // Support requests that need an answer; danger = an emergency is open
  const [pendingSupport, setPendingSupport] = useState({ count: 0, danger: false });
  // Everything waiting for the admin (Notifications page)
  const [pendingAlerts, setPendingAlerts] = useState(0);

  const refreshPendingCranes = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/cranes/summary', { method: 'POST' });
      setPendingCranes(res.data.under_review);
    } catch (e) {
      // badge is cosmetic; ignore when the API is unreachable or not signed in
    }
    try {
      const res = await apiRequest('/admin/support/tickets/summary', { method: 'POST' });
      setPendingSupport({ count: res.data.needs_attention, danger: res.data.emergency_open > 0 });
    } catch (e) {
      // same: cosmetic
    }
    try {
      const res = await apiRequest('/admin/alerts', { method: 'POST' });
      setPendingAlerts(res.data.total);
    } catch (e) {
      // same: cosmetic
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
    setSelectedUserId(userId);
    setMemberBack('users');
    setActiveView('user-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToUsers = () => {
    setActiveView('users');
  };

  const handleSelectOwner = (ownerId, back = 'owners') => {
    setSelectedOwnerId(ownerId);
    setMemberBack(back);
    setActiveView('owner-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToOwners = () => {
    setActiveView('owners');
  };

  const handleSelectOperator = (operatorId, back = 'operators') => {
    setSelectedOperatorId(operatorId);
    setMemberBack(back);
    setActiveView('operator-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToOperators = () => {
    setActiveView('operators');
  };

  const handleSelectCrane = (craneId, back = 'cranes') => {
    setSelectedCraneId(craneId);
    setCraneBack(back);
    setActiveView('crane-details');
    setMobileSidebarOpen(false);
  };

  const handleBackToCranes = () => {
    setActiveView(craneBack);
  };

  // Crane details -> its owner or operator
  const handleOpenCraneMember = (id, kind) => {
    if (kind === 'owner') handleSelectOwner(id, 'crane-details');
    else handleSelectOperator(id, 'crane-details');
  };

  // Mock screens (dashboard overview, bookings) still pass sample ids such as USR-10245
  const isRealId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(id || ''));


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
        badges={{ 'crane-approvals': pendingCranes, support: pendingSupport, notifications: pendingAlerts }}
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
          {activeView === 'dashboard' && <AdminDashboard onNavigate={handleNavigate} />}

          {activeView === 'users' && (
            <DirectoryList kind="users" onSelect={handleSelectUser} />
          )}

          {activeView === 'user-details' && (
            isRealId(selectedUserId) ? (
              <MemberDetails
                userId={selectedUserId}
                onBack={() => setActiveView(memberBack)}
                onSelectCrane={(id) => handleSelectCrane(id, 'user-details')}
              />
            ) : (
              <UserDetails userId={selectedUserId || undefined} onBack={handleBackToUsers} />
            )
          )}

          {activeView === 'owners' && (
            <DirectoryList kind="owners" onSelect={handleSelectOwner} />
          )}

          {activeView === 'owner-details' && (
            <MemberDetails
              userId={selectedOwnerId}
              onBack={() => setActiveView(memberBack)}
              onSelectCrane={(id) => handleSelectCrane(id, 'owner-details')}
            />
          )}

          {activeView === 'operators' && (
            <DirectoryList kind="operators" onSelect={handleSelectOperator} />
          )}

          {activeView === 'operator-details' && (
            <MemberDetails
              userId={selectedOperatorId}
              onBack={() => setActiveView(memberBack)}
              onSelectCrane={(id) => handleSelectCrane(id, 'operator-details')}
            />
          )}

          {activeView === 'cranes' && (
            <DirectoryList kind="cranes" onSelect={handleSelectCrane} />
          )}

          {activeView === 'crane-details' && (
            isRealId(selectedCraneId) ? (
              <CraneDetailsLive
                craneId={selectedCraneId}
                onBack={handleBackToCranes}
                onSelectMember={handleOpenCraneMember}
                onReviewed={refreshPendingCranes}
              />
            ) : (
              <CraneDetails
                craneId={selectedCraneId || undefined}
                onBack={handleBackToCranes}
                onNavigateToBookings={() => setActiveView('bookings')}
              />
            )
          )}

          {activeView === 'bookings' && <AdminBookings />}

          {/* old matching screen is replaced by the live crane requests */}
          {(activeView === 'crane-requests' || activeView === 'crane-matching') && <CraneRequests />}

          {activeView === 'reviews' && <AdminReviews />}

          {activeView === 'reports' && <AdminReports />}

          {activeView === 'notifications' && <AdminAlerts onNavigate={handleNavigate} />}

          {activeView === 'crane-approvals' && <CraneApprovals onReviewed={refreshPendingCranes} />}

          {activeView === 'settings' && <SettingsDropdowns />}

          {activeView === 'legal' && <LegalPagesEditor />}

          {activeView === 'support' && <SupportCenter onChanged={refreshPendingCranes} />}

          {activeView === 'announcements' && <Announcements />}

          {activeView === 'banners' && <Banners />}

          {activeView === 'payments' && <Payments />}

          {activeView === 'settlements' && <Settlements />}

          {activeView === 'complaints' && <Complaints />}

          {activeView === 'platform-fee' && <PlatformFee />}

          {activeView === 'pricing-rules' && <PricingRules />}

          {activeView === 'app-versions' && <AppVersions />}

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
            'legal',
            'support',
            'announcements',
            'banners',
            'settings',
            'payments',
            'settlements',
            'complaints',
            'platform-fee',
            'crane-requests',
            'pricing-rules',
            'app-versions',
            'reviews',
            'reports',
            'notifications',
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
