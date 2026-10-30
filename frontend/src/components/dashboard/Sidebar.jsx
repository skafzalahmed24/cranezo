import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  HardHat,
  Construction,
  ShieldCheck,
  CalendarCheck2,
  CreditCard,
  Star,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

export const Sidebar = ({ activeView, onNavigate, onLogout, mobileOpen, onCloseMobile, badges = {} }) => {
  const navSections = [
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
        { id: 'payments', label: 'Payments', icon: CreditCard },
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
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogoutClick = () => {
    if (onCloseMobile) onCloseMobile();
    onLogout();
  };

  return (
    <aside className={`cranzo-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="cranzo-sidebar-brand">
        <img src={logoImg} alt="Cranzo Heavy Equipment Platform" />
        <button
          type="button"
          className="cranzo-mobile-close-btn"
          onClick={onCloseMobile}
          title="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="cranzo-sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={idx} className="cranzo-nav-group">
            {section.title && (
              <div className="cranzo-nav-section-title">{section.title}</div>
            )}
            <ul className="cranzo-nav-list">
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
                      className={`cranzo-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                      {badges[item.id] > 0 && (
                        <span className="cranzo-nav-badge" title={`${badges[item.id]} pending`}>
                          {badges[item.id] > 99 ? '99+' : badges[item.id]}
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

      <div className="cranzo-sidebar-footer">
        <button
          type="button"
          className="cranzo-nav-item cranzo-nav-item-logout"
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
