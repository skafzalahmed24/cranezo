import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Ban,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CalendarCheck,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Search,
  Home,
  Building,
  Navigation,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const UserDetails = ({ userId = 'USR-10245', onBack }) => {
  const [activeTab, setActiveTab] = useState('Booking History');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingPage, setBookingPage] = useState(1);

  const bookingsList = [
    {
      id: '#CRZ10245',
      craneType: 'Mobile Crane (50 Ton)',
      date: '08 Oct 2026',
      location: 'Hyderabad',
      amount: '₹ 12,500',
      status: 'In Progress',
      statusClass: 'in-progress',
    },
    {
      id: '#CRZ10244',
      craneType: 'Tower Crane (30 Ton)',
      date: '05 Oct 2026',
      location: 'Hyderabad',
      amount: '₹ 18,000',
      status: 'Completed',
      statusClass: 'completed',
    },
    {
      id: '#CRZ10231',
      craneType: 'Truck Crane (25 Ton)',
      date: '28 Sep 2026',
      location: 'Vijayawada',
      amount: '₹ 9,500',
      status: 'Completed',
      statusClass: 'completed',
    },
    {
      id: '#CRZ10228',
      craneType: 'Crawler Crane (100 Ton)',
      date: '18 Sep 2026',
      location: 'Bengaluru',
      amount: '₹ 45,000',
      status: 'Cancelled',
      statusClass: 'cancelled',
    },
    {
      id: '#CRZ10220',
      craneType: 'Mobile Crane (70 Ton)',
      date: '08 Sep 2026',
      location: 'Hyderabad',
      amount: '₹ 22,000',
      status: 'Completed',
      statusClass: 'completed',
    },
  ];

  const filteredBookings = bookingsList.filter(
    (b) =>
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.craneType.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.location.toLowerCase().includes(bookingSearch.toLowerCase())
  );

  return (
    <div className="cranezo-content-view animate-fade-in">
      {/* Top Header Bar */}
      <div className="cranezo-user-details-topbar">
        <div>
          <button
            type="button"
            className="cranezo-filter-reset"
            style={{ padding: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onBack}
          >
            <ArrowLeft size={14} />
            <span>Back to Users</span>
          </button>
          <div className="cranezo-user-details-title-row">
            <h2 className="cranezo-greeting-title" style={{ fontSize: '24px' }}>
              User Details
            </h2>
            <span className="cranezo-status-badge active" style={{ fontSize: '11px', padding: '2px 8px' }}>
              Active
            </span>
          </div>
          <p className="cranezo-greeting-subtitle">User ID: {userId}</p>
        </div>

        <div className="cranezo-header-actions-group">
          <button
            type="button"
            className="cranezo-btn-secondary"
            onClick={() => alert('Opening Edit User dialog...')}
          >
            <Edit2 size={15} color="#f59e0b" />
            <span>Edit User</span>
          </button>
          <button
            type="button"
            className="cranezo-btn-danger-outline"
            onClick={() => {
              if (window.confirm('Are you sure you want to block this user?')) {
                alert('User has been blocked.');
              }
            }}
          >
            <Ban size={15} />
            <span>Block User</span>
          </button>
        </div>
      </div>

      {/* Hero Grid: Profile Card & Quick Stats */}
      <div className="cranezo-user-hero-grid">
        {/* Left: User Profile Card */}
        <div className="cranezo-profile-card">
          <div className="cranezo-profile-header-area">
            <div className="cranezo-profile-avatar-row">
              <div className="cranezo-profile-large-avatar">
                RK
                <span className="online-dot" />
              </div>
              <div className="cranezo-profile-meta-info">
                <h2>Rahul Kumar</h2>
                <p>USR-10245 • Customer since Jan 2026</p>
                <span className="cranezo-status-badge active" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  Active
                </span>
              </div>
            </div>

            <button
              type="button"
              className="cranezo-action-btn"
              title="More options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="cranezo-profile-details-grid">
            <div className="cranezo-detail-field">
              <span className="cranezo-detail-label">
                <Phone size={13} color="#f59e0b" />
                Phone Number
              </span>
              <span className="cranezo-detail-value">+91 98765 43210</span>
            </div>

            <div className="cranezo-detail-field">
              <span className="cranezo-detail-label">
                <Mail size={13} color="#f59e0b" />
                Email Address
              </span>
              <span className="cranezo-detail-value">rahul.kumar@example.com</span>
            </div>

            <div className="cranezo-detail-field">
              <span className="cranezo-detail-label">
                <MapPin size={13} color="#f59e0b" />
                Location
              </span>
              <span className="cranezo-detail-value">Hyderabad, Telangana</span>
            </div>

            <div className="cranezo-detail-field">
              <span className="cranezo-detail-label">
                <Calendar size={13} color="#f59e0b" />
                Registration Date
              </span>
              <span className="cranezo-detail-value">15 Jan 2026</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Stats Card */}
        <div className="cranezo-quick-stats-card">
          <h3 className="cranezo-card-title">Quick Stats</h3>
          <div className="cranezo-quick-stats-grid">
            <div className="cranezo-quick-stat-box">
              <div className="cranezo-stat-icon-box">
                <CalendarCheck size={18} />
              </div>
              <div className="cranezo-stat-info">
                <span className="cranezo-stat-label">Total Bookings</span>
                <span className="cranezo-stat-value" style={{ fontSize: '20px' }}>24</span>
              </div>
            </div>

            <div className="cranezo-quick-stat-box">
              <div className="cranezo-stat-icon-box">
                <IndianRupee size={18} />
              </div>
              <div className="cranezo-stat-info">
                <span className="cranezo-stat-label">Total Spent</span>
                <span className="cranezo-stat-value" style={{ fontSize: '18px' }}>₹ 1,84,500</span>
              </div>
            </div>

            <div className="cranezo-quick-stat-box">
              <div className="cranezo-stat-icon-box green">
                <CheckCircle2 size={18} />
              </div>
              <div className="cranezo-stat-info">
                <span className="cranezo-stat-label">Completed Jobs</span>
                <span className="cranezo-stat-value" style={{ fontSize: '20px' }}>21</span>
              </div>
            </div>

            <div className="cranezo-quick-stat-box">
              <div className="cranezo-stat-icon-box red">
                <XCircle size={18} />
              </div>
              <div className="cranezo-stat-info">
                <span className="cranezo-stat-label">Cancelled Bookings</span>
                <span className="cranezo-stat-value" style={{ fontSize: '20px' }}>3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="cranezo-tabs-nav">
        {['Booking History', 'Saved Addresses', 'Account Activity', 'Support History'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`cranezo-tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Booking History Table Card */}
      <div className="cranezo-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="cranezo-card-header">
          <div>
            <h3 className="cranezo-card-title">Booking History</h3>
            <p className="cranezo-card-subtitle">All crane bookings made by this user.</p>
          </div>

          <div className="cranezo-header-search" style={{ width: '220px' }}>
            <Search size={14} className="cranezo-header-search-icon" />
            <input
              type="text"
              className="cranezo-header-search-input"
              style={{ width: '100%', height: '34px', fontSize: '12px' }}
              placeholder="Search bookings..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="cranezo-table-container">
          <table className="cranezo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '110px' }}>BOOKING ID</th>
                <th style={{ minWidth: '170px' }}>CRANE TYPE</th>
                <th style={{ minWidth: '110px' }}>DATE</th>
                <th style={{ minWidth: '130px' }}>LOCATION</th>
                <th style={{ minWidth: '110px' }}>AMOUNT</th>
                <th style={{ minWidth: '120px' }}>STATUS</th>
                <th style={{ textAlign: 'center', minWidth: '80px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((row) => (
                <tr key={row.id}>
                  <td className="cranezo-booking-id highlight">{row.id}</td>
                  <td style={{ color: '#ffffff' }}>{row.craneType}</td>
                  <td>{row.date}</td>
                  <td>{row.location}</td>
                  <td style={{ color: '#ffffff', fontWeight: 600 }}>{row.amount}</td>
                  <td>
                    <span className={`cranezo-status-badge ${row.statusClass}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="cranezo-btn-secondary"
                      style={{ height: '28px', padding: '0 12px', fontSize: '11px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                      onClick={() => alert(`Viewing details for ${row.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="cranezo-pagination-bar" style={{ marginTop: '12px' }}>
          <span className="cranezo-pagination-text">Showing 1 to 5 of 24 bookings</span>
          <div className="cranezo-pagination-controls">
            <button
              type="button"
              className="cranezo-page-btn disabled"
              disabled
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${bookingPage === 1 ? 'active' : ''}`}
              onClick={() => setBookingPage(1)}
            >
              1
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${bookingPage === 2 ? 'active' : ''}`}
              onClick={() => setBookingPage(2)}
            >
              2
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${bookingPage === 3 ? 'active' : ''}`}
              onClick={() => setBookingPage(3)}
            >
              3
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${bookingPage === 4 ? 'active' : ''}`}
              onClick={() => setBookingPage(4)}
            >
              4
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${bookingPage === 5 ? 'active' : ''}`}
              onClick={() => setBookingPage(5)}
            >
              5
            </button>
            <button
              type="button"
              className="cranezo-page-btn"
              onClick={() => setBookingPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row (Saved Addresses + Recent Account Activity) */}
      <div className="cranezo-bottom-double-grid">
        {/* Left: Saved Addresses */}
        <div className="cranezo-card">
          <div className="cranezo-card-header">
            <h3 className="cranezo-card-title">Saved Addresses</h3>
            <button
              type="button"
              className="cranezo-action-link"
              onClick={() => alert('Viewing all saved addresses')}
            >
              View All
            </button>
          </div>

          <div className="cranezo-address-list">
            <div className="cranezo-address-item">
              <div className="cranezo-address-left">
                <div className="cranezo-address-icon-box">
                  <Home size={18} />
                </div>
                <div>
                  <div className="cranezo-address-title-row">
                    <span className="cranezo-address-title">Home</span>
                    <span className="cranezo-default-badge">Default</span>
                  </div>
                  <p className="cranezo-address-desc">
                    Banjara Hills, Hyderabad, Telangana
                  </p>
                </div>
              </div>
              <button type="button" className="cranezo-action-btn">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="cranezo-address-item">
              <div className="cranezo-address-left">
                <div className="cranezo-address-icon-box gray">
                  <Building size={18} />
                </div>
                <div>
                  <div className="cranezo-address-title-row">
                    <span className="cranezo-address-title">Office</span>
                  </div>
                  <p className="cranezo-address-desc">
                    Hitech City, Hyderabad, Telangana
                  </p>
                </div>
              </div>
              <button type="button" className="cranezo-action-btn">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="cranezo-address-item">
              <div className="cranezo-address-left">
                <div className="cranezo-address-icon-box gray">
                  <Navigation size={18} />
                </div>
                <div>
                  <div className="cranezo-address-title-row">
                    <span className="cranezo-address-title">Site Location</span>
                  </div>
                  <p className="cranezo-address-desc">
                    Gachibowli, Hyderabad, Telangana
                  </p>
                </div>
              </div>
              <button type="button" className="cranezo-action-btn">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recent Account Activity */}
        <div className="cranezo-card">
          <div className="cranezo-card-header">
            <h3 className="cranezo-card-title">Recent Account Activity</h3>
            <button
              type="button"
              className="cranezo-action-link"
              onClick={() => alert('Viewing complete account activity audit logs')}
            >
              View All
            </button>
          </div>

          <div className="cranezo-activity-timeline">
            <div className="cranezo-activity-item">
              <span className="cranezo-activity-dot amber" />
              <span className="cranezo-activity-time">08 Oct 2026, 10:30 AM</span>
              <p className="cranezo-activity-desc">
                New booking created <strong style={{ color: '#f59e0b' }}>#CRZ10245</strong>
              </p>
            </div>

            <div className="cranezo-activity-item">
              <span className="cranezo-activity-dot green" />
              <span className="cranezo-activity-time">05 Oct 2026, 04:20 PM</span>
              <p className="cranezo-activity-desc">
                Payment completed <strong style={{ color: '#10b981' }}>₹ 18,000</strong>
              </p>
            </div>

            <div className="cranezo-activity-item">
              <span className="cranezo-activity-dot teal" />
              <span className="cranezo-activity-time">29 Sep 2026, 11:15 AM</span>
              <p className="cranezo-activity-desc">
                Booking completed <strong style={{ color: '#f59e0b' }}>#CRZ10231</strong>
              </p>
            </div>

            <div className="cranezo-activity-item">
              <span className="cranezo-activity-dot red" />
              <span className="cranezo-activity-time">18 Sep 2026, 02:30 PM</span>
              <p className="cranezo-activity-desc">
                Booking cancelled <strong style={{ color: '#f59e0b' }}>#CRZ10228</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
