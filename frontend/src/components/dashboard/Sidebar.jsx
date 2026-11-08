import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  HardHat,
  Construction,
  ShieldCheck,
  FileText,
  LifeBuoy,
  Images,
  Megaphone,
  Smartphone,
  UserCog,
  CalendarCheck2,
  CreditCard,
  Star,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  X,
  Wallet,
  MessageSquareWarning,
  Percent,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { canView } from '../../utils/access';
import logoImg from '../../assets/logo.png';

const badgeCount = (badge) => (badge && typeof badge === 'object' ? badge.count : badge) || 0;

export const Sidebar = ({ activeView, onNavigate, onLogout, mobileOpen, onCloseMobile, badges = {}, permissions = null }) => {
  const allSections = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'owners', label: 'Owners', icon: Briefcase },
        { id: 'operators', label: 'Operators', icon: HardHat },
        { id: 'cranes', label: 'Cranes', icon: Construction },
        { id: 'crane-approvals', label: 'Crane Approvals', icon: ShieldCheck },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'bookings', label: 'Bookings', icon: CalendarCheck2 },
        { id: 'crane-requests', label: 'Crane Requests', icon: Search },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'settlements', label: 'Settlements', icon: Wallet },
        { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
        { id: 'reviews', label: 'Reviews', icon: Star },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'banners', label: 'Banners', icon: Images },
        { id: 'support', label: 'Support', icon: LifeBuoy },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'legal', label: 'Legal Pages', icon: FileText },
        { id: 'platform-fee', label: 'Platform Fee', icon: Percent },
        { id: 'pricing-rules', label: 'Pricing Rules', icon: SlidersHorizontal },
        { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
        { id: 'app-versions', label: 'App Versions', icon: Smartphone },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
    {
      title: 'ACCESS',
      items: [
        { id: 'admin-access', label: 'Admins & Roles', icon: UserCog },
      ],
    },
  ];
  // each account sees only the pages of its role (the Super Admin sees all)
  const navSections = allSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canView(permissions, item.id)) }))
    .filter((section) => section.items.length > 0);

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogoutClick = () => {
    if (onCloseMobile) onCloseMobile();
    onLogout();
  };

  return (
    <aside className={`cranezo-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="cranezo-sidebar-brand">
        <img src={logoImg} alt="Cranezo Heavy Equipment Platform" />
        <button
          type="button"
          className="cranezo-mobile-close-btn"
          onClick={onCloseMobile}
          title="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="cranezo-sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={idx} className="cranezo-nav-group">
            {section.title && (
              <div className="cranezo-nav-section-title">{section.title}</div>
            )}
            <ul className="cranezo-nav-list">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive =
                  activeView === item.id ||
                  (item.id === 'users' && activeView === 'user-details') ||
                  (item.id === 'owners' && activeView === 'owner-details') ||
                  (item.id === 'operators' && activeView === 'operator-details') ||
                  (item.id === 'cranes' && activeView === 'crane-details') ||
                  (item.id === 'bookings' && activeView === 'crane-matching');
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`cranezo-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                      {badgeCount(badges[item.id]) > 0 && (
                        <span
                          className={`cranezo-nav-badge ${badges[item.id] && badges[item.id].danger ? 'danger' : ''}`}
                          title={`${badgeCount(badges[item.id])} pending`}
                        >
                          {badgeCount(badges[item.id]) > 99 ? '99+' : badgeCount(badges[item.id])}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="cranezo-sidebar-footer">
        <button
          type="button"
          className="cranezo-nav-item cranezo-nav-item-logout"
          onClick={handleLogoutClick}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
