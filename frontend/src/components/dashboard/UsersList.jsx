import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Download,
  Filter,
  Plus,
  Search,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const UsersList = ({ onSelectUser, onAddUserClick, customUsers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const initialUsers = [
    {
      id: 1,
      userId: 'USR-10245',
      name: 'Rahul Kumar',
      email: 'rahul.kumar@example.com',
      contact: '+91 98765 43210',
      location: 'Hyderabad',
      bookings: 24,
      totalSpent: '₹ 1,84,500',
      joined: 'Jan 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 2,
      userId: 'USR-10246',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      contact: '+91 98765 43211',
      location: 'Hyderabad',
      bookings: 12,
      totalSpent: '₹ 92,000',
      joined: 'Feb 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 3,
      userId: 'USR-10247',
      name: 'Suresh Reddy',
      email: 'suresh.reddy@example.com',
      contact: '+91 98765 43212',
      location: 'Vijayawada',
      bookings: 8,
      totalSpent: '₹ 64,500',
      joined: 'Mar 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 4,
      userId: 'USR-10248',
      name: 'Neha Patel',
      email: 'neha.patel@example.com',
      contact: '+91 98765 43213',
      location: 'Bengaluru',
      bookings: 3,
      totalSpent: '₹ 22,000',
      joined: 'Apr 2026',
      status: 'Blocked',
      statusClass: 'blocked',
    },
    {
      id: 5,
      userId: 'USR-10249',
      name: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      contact: '+91 98765 43214',
      location: 'Delhi',
      bookings: 15,
      totalSpent: '₹ 1,20,000',
      joined: 'May 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 6,
      userId: 'USR-10250',
      name: 'Kavya Reddy',
      email: 'kavya.reddy@example.com',
      contact: '+91 98765 43215',
      location: 'Hyderabad',
      bookings: 7,
      totalSpent: '₹ 48,000',
      joined: 'May 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 7,
      userId: 'USR-10251',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@example.com',
      contact: '+91 98765 43216',
      location: 'Mumbai',
      bookings: 11,
      totalSpent: '₹ 86,500',
      joined: 'Jun 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 8,
      userId: 'USR-10252',
      name: 'Pooja Iyer',
      email: 'pooja.iyer@example.com',
      contact: '+91 98765 43217',
      location: 'Chennai',
      bookings: 5,
      totalSpent: '₹ 35,000',
      joined: 'Jun 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 9,
      userId: 'USR-10253',
      name: 'Karthik Rao',
      email: 'karthik.rao@example.com',
      contact: '+91 98765 43218',
      location: 'Pune',
      bookings: 9,
      totalSpent: '₹ 62,000',
      joined: 'Jul 2026',
      status: 'Active',
      statusClass: 'active',
    },
    {
      id: 10,
      userId: 'USR-10254',
      name: 'Ananya Desai',
      email: 'ananya.desai@example.com',
      contact: '+91 98765 43219',
      location: 'Ahmedabad',
      bookings: 4,
      totalSpent: '₹ 28,500',
      joined: 'Jul 2026',
      status: 'Blocked',
      statusClass: 'blocked',
    },
  ];

  // Combine dynamically added custom users with initial users
  const allUsers = [...customUsers, ...initialUsers];

  // Filtering
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contact.includes(searchQuery) ||
      (user.company && user.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'All' || user.status === selectedStatus;

    const matchesLocation =
      selectedLocation === 'All' || user.location === selectedLocation;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredUsers.map((u) => u.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All');
    setSelectedLocation('All');
    setSelectedDate('All');
    setSelectedActivity('All');
  };

  const statCards = [
    {
      label: 'Total Users',
      value: '2,458',
      trend: '↑ 12.5%',
      trendType: 'up',
      icon: Users,
      boxClass: '',
    },
    {
      label: 'Active Users',
      value: '2,186',
      trend: '↑ 8.4%',
      trendType: 'up',
      icon: UserCheck,
      boxClass: 'green',
    },
    {
      label: 'New This Month',
      value: '184',
      trend: '↑ 16.3%',
      trendType: 'up',
      icon: UserPlus,
      boxClass: '',
    },
    {
      label: 'Blocked Users',
      value: '88',
      trend: '↓ 2.1%',
      trendType: 'down',
      icon: UserX,
      boxClass: 'red',
    },
  ];

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Header & Actions Row */}
      <div className="cranzo-users-header-row">
        <div>
          <h2 className="cranzo-greeting-title">Users</h2>
          <p className="cranzo-greeting-subtitle">
            Manage and monitor all customers registered on Cranzo.
          </p>
        </div>

        <div className="cranzo-header-actions-group">
          <button
            type="button"
            className="cranzo-btn-secondary"
            onClick={() => alert('Exporting user report as CSV/Excel...')}
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-secondary"
            onClick={() => {}}
          >
            <Filter size={15} />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-primary-amber"
            onClick={onAddUserClick}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="cranzo-stats-grid-4">
        {statCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div key={idx} className="cranzo-stat-card">
              <div className="cranzo-stat-card-left">
                <div className={`cranzo-stat-icon-box ${card.boxClass}`}>
                  <IconComponent size={20} />
                </div>
                <div className="cranzo-stat-info">
                  <span className="cranzo-stat-label">{card.label}</span>
                  <span className="cranzo-stat-value">{card.value}</span>
                </div>
              </div>
              <span className={`cranzo-trend-pill ${card.trendType}`}>
                {card.trend}
              </span>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="cranzo-filter-toolbar">
        <div className="cranzo-filter-search-box">
          <Search size={15} />
          <input
            type="text"
            className="cranzo-filter-search-input"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="cranzo-select-dropdown"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="All">User Status</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>

        <select
          className="cranzo-select-dropdown"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          <option value="All">Registration Date</option>
          <option value="month">This Month</option>
          <option value="year">Year 2026</option>
        </select>

        <select
          className="cranzo-select-dropdown"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="All">Location</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Vijayawada">Vijayawada</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Delhi">Delhi</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Chennai">Chennai</option>
          <option value="Pune">Pune</option>
          <option value="Ahmedabad">Ahmedabad</option>
        </select>

        <select
          className="cranzo-select-dropdown"
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
        >
          <option value="All">Booking Activity</option>
          <option value="high">High (&gt; 10 bookings)</option>
          <option value="medium">Medium (5-10 bookings)</option>
          <option value="low">Low (&lt; 5 bookings)</option>
        </select>

        <button
          type="button"
          className="cranzo-filter-reset"
          onClick={resetFilters}
        >
          Reset
        </button>
      </div>

      {/* Users Table Card */}
      <div className="cranzo-card" style={{ padding: '8px 16px 16px 16px', width: '100%', boxSizing: 'border-box' }}>
        <div className="cranzo-table-container">
          <table className="cranzo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#f59e0b' }}
                  />
                </th>
                <th style={{ width: '45px' }}>#</th>
                <th style={{ minWidth: '160px' }}>USER</th>
                <th style={{ minWidth: '140px' }}>CONTACT</th>
                <th style={{ minWidth: '120px' }}>LOCATION</th>
                <th style={{ textAlign: 'center', minWidth: '90px' }}>BOOKINGS</th>
                <th style={{ minWidth: '120px' }}>TOTAL SPENT</th>
                <th style={{ minWidth: '100px' }}>JOINED</th>
                <th style={{ minWidth: '100px' }}>STATUS</th>
                <th style={{ textAlign: 'center', minWidth: '80px' }}>ACT</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSelected = selectedRows.includes(user.id);
                const initials = user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase();

                return (
                  <tr
                    key={user.id}
                    style={{
                      background: isSelected
                        ? 'rgba(245, 158, 11, 0.05)'
                        : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(user.id)}
                        style={{ cursor: 'pointer', accentColor: '#f59e0b' }}
                      />
                    </td>
                    <td style={{ color: '#64748b' }}>{user.id}</td>
                    <td>
                      <div className="cranzo-user-cell">
                        <div className="cranzo-table-avatar">{initials}</div>
                        <div>
                          <span
                            className="cranzo-link-text"
                            onClick={() => onSelectUser(user.userId)}
                          >
                            {user.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{user.contact}</td>
                    <td>{user.location}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {user.bookings}
                    </td>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>
                      {user.totalSpent}
                    </td>
                    <td>{user.joined}</td>
                    <td>
                      <span className={`cranzo-status-badge ${user.statusClass}`}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          className="cranzo-action-btn"
                          title="View Details"
                          onClick={() => onSelectUser(user.userId)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="cranzo-action-btn"
                          title="Edit User"
                          onClick={() =>
                            alert(`Editing user: ${user.name} (${user.userId})`)
                          }
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="cranzo-pagination-bar">
          <span className="cranzo-pagination-text">
            Showing 1 to {filteredUsers.length} of 2,458 users
          </span>

          <div className="cranzo-pagination-controls">
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 2 ? 'active' : ''}`}
              onClick={() => setCurrentPage(2)}
            >
              2
            </button>
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 3 ? 'active' : ''}`}
              onClick={() => setCurrentPage(3)}
            >
              3
            </button>
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 4 ? 'active' : ''}`}
              onClick={() => setCurrentPage(4)}
            >
              4
            </button>
            <button
              type="button"
              className={`cranzo-page-btn ${currentPage === 5 ? 'active' : ''}`}
              onClick={() => setCurrentPage(5)}
            >
              5
            </button>
            <span style={{ color: '#64748b', padding: '0 4px', fontSize: '12px' }}>
              ...
            </span>
            <button
              type="button"
              className="cranzo-page-btn"
              onClick={() => setCurrentPage(246)}
            >
              246
            </button>
            <button
              type="button"
              className="cranzo-page-btn"
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersList;
