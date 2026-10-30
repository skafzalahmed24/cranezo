import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  Clock,
  Ban,
  Search,
  RotateCcw,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const OwnersList = ({ onSelectOwner }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedCranesCount, setSelectedCranesCount] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const statCards = [
    {
      id: 'total',
      label: 'Total Owners',
      value: '186',
      trend: '+ 8.2%',
      trendDirection: 'up',
      color: 'amber',
      icon: Truck,
    },
    {
      id: 'verified',
      label: 'Verified Owners',
      value: '154',
      trend: '+ 6.4%',
      trendDirection: 'up',
      color: 'green',
      icon: ShieldCheck,
    },
    {
      id: 'pending',
      label: 'Pending Verification',
      value: '24',
      trend: '+ 12.5%',
      trendDirection: 'up',
      color: 'amber',
      icon: Clock,
    },
    {
      id: 'suspended',
      label: 'Suspended Owners',
      value: '8',
      trend: '+ 2.1%',
      trendDirection: 'up',
      color: 'red',
      icon: Ban,
    },
  ];

  const initialOwners = [
    {
      id: 1,
      ownerId: 'OWN-1001',
      name: 'ABC Crane Services',
      initial: 'A',
      avatarBg: '#0284c7', // blue
      phone: '+91 98765 12345',
      email: 'abc@cranes.com',
      location: 'Hyderabad',
      cranes: 12,
      bookings: 84,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 2,
      ownerId: 'OWN-1002',
      name: 'XYZ Lifting',
      initial: 'X',
      avatarBg: '#0284c7', // blue
      phone: '+91 98765 23456',
      email: 'xyz@lifting.com',
      location: 'Vijayawada',
      cranes: 8,
      bookings: 56,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 3,
      ownerId: 'OWN-1003',
      name: 'Reddy Cranes',
      initial: 'R',
      avatarBg: '#d97706', // amber
      phone: '+91 98765 34567',
      email: 'reddy@cranes.com',
      location: 'Kakinada',
      cranes: 5,
      bookings: 21,
      verification: 'Pending',
      status: 'Pending',
    },
    {
      id: 4,
      ownerId: 'OWN-1004',
      name: 'Gupta Infra',
      initial: 'G',
      avatarBg: '#059669', // green
      phone: '+91 98765 45678',
      email: 'gupta@infra.com',
      location: 'Bengaluru',
      cranes: 10,
      bookings: 43,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 5,
      ownerId: 'OWN-1005',
      name: 'Patel Cranes',
      initial: 'P',
      avatarBg: '#7c3aed', // purple
      phone: '+91 98765 56789',
      email: 'patel@cranes.com',
      location: 'Mumbai',
      cranes: 7,
      bookings: 32,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 6,
      ownerId: 'OWN-1006',
      name: 'Omni Cranes',
      initial: 'O',
      avatarBg: '#0d9488', // teal
      phone: '+91 98765 67890',
      email: 'omni@cranes.com',
      location: 'Chennai',
      cranes: 6,
      bookings: 18,
      verification: 'Pending',
      status: 'Pending',
    },
    {
      id: 7,
      ownerId: 'OWN-1007',
      name: 'Sri Cranes',
      initial: 'S',
      avatarBg: '#7c3aed', // purple
      phone: '+91 98765 78901',
      email: 'sri@cranes.com',
      location: 'Hyderabad',
      cranes: 4,
      bookings: 27,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 8,
      ownerId: 'OWN-1008',
      name: 'Mehta Infra',
      initial: 'M',
      avatarBg: '#dc2626', // red
      phone: '+91 98765 89012',
      email: 'mehta@infra.com',
      location: 'Pune',
      cranes: 9,
      bookings: 40,
      verification: 'Verified',
      status: 'Active',
    },
    {
      id: 9,
      ownerId: 'OWN-1009',
      name: 'Apex Lifting',
      initial: 'A',
      avatarBg: '#b91c1c', // dark red
      phone: '+91 98765 90123',
      email: 'apex@lifting.com',
      location: 'Delhi',
      cranes: 3,
      bookings: 12,
      verification: 'Suspended',
      status: 'Suspended',
    },
    {
      id: 10,
      ownerId: 'OWN-1010',
      name: 'Kiran Cranes',
      initial: 'K',
      avatarBg: '#0d9488', // teal
      phone: '+91 98765 01234',
      email: 'kiran@cranes.com',
      location: 'Ahmedabad',
      cranes: 5,
      bookings: 19,
      verification: 'Verified',
      status: 'Active',
    },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedVerification('All');
    setSelectedStatus('All');
    setSelectedLocation('All');
    setSelectedDate('All');
    setSelectedCranesCount('All');
  };

  const filteredOwners = initialOwners.filter((owner) => {
    const matchesSearch =
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.phone.includes(searchQuery) ||
      owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification =
      selectedVerification === 'All' || owner.verification === selectedVerification;

    const matchesStatus =
      selectedStatus === 'All' || owner.status === selectedStatus;

    const matchesLocation =
      selectedLocation === 'All' || owner.location === selectedLocation;

    return matchesSearch && matchesVerification && matchesStatus && matchesLocation;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredOwners.map((o) => o.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderBadge = (type, val) => {
    const v = val.toLowerCase();
    if (v === 'verified' || v === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
          }}
        >
          {val}
        </span>
      );
    }
    if (v === 'pending') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
          }}
        >
          {val}
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '11.5px',
          fontWeight: '600',
          padding: '3px 10px',
          borderRadius: '9999px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
        }}
      >
        {val}
      </span>
    );
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* 4 Stat Cards Row */}
      <div className="cranzo-stats-grid-4">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div key={card.id} className="cranzo-stat-card">
              <div className="cranzo-stat-card-left">
                <div className={`cranzo-stat-icon-box ${card.color}`}>
                  <IconComponent size={20} />
                </div>
                <div className="cranzo-stat-info">
                  <span className="cranzo-stat-label">{card.label}</span>
                  <span className="cranzo-stat-value">{card.value}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <TrendingUp size={12} />
                <span>{card.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div
        className="cranzo-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              flex: '1 1 300px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', color: '#64748b' }}
            />
            <input
              type="text"
              placeholder="Search owner name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                background: '#070D17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                padding: '0 12px 0 36px',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            style={{
              height: '38px',
              background: '#070D17',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '12.5px',
              padding: '0 12px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="All">Verification Status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              height: '38px',
              background: '#070D17',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '12.5px',
              padding: '0 12px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="All">Account Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        {/* Second Row Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                height: '34px',
                background: '#070D17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '12px',
                padding: '0 10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All">Registration Date</option>
              <option value="Recent">Last 30 Days</option>
              <option value="Year">This Year</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{
                height: '34px',
                background: '#070D17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '12px',
                padding: '0 10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All">Location</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Vijayawada">Vijayawada</option>
              <option value="Kakinada">Kakinada</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
              <option value="Delhi">Delhi</option>
              <option value="Ahmedabad">Ahmedabad</option>
            </select>

            <select
              value={selectedCranesCount}
              onChange={(e) => setSelectedCranesCount(e.target.value)}
              style={{
                height: '34px',
                background: '#070D17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '12px',
                padding: '0 10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All">Number of Cranes</option>
              <option value="1-5">1 - 5 Cranes</option>
              <option value="6-10">6 - 10 Cranes</option>
              <option value="10+">10+ Cranes</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f59e0b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Owners Table Card */}
      <div className="cranzo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="cranzo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', padding: '14px 12px 14px 18px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      selectedRows.length > 0 &&
                      selectedRows.length === filteredOwners.length
                    }
                  />
                </th>
                <th style={{ width: '40px' }}>#</th>
                <th>OWNER NAME</th>
                <th>CONTACT</th>
                <th>LOCATION</th>
                <th>CRANES</th>
                <th>BOOKINGS</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredOwners.map((owner) => {
                const isSelected = selectedRows.includes(owner.id);
                return (
                  <tr
                    key={owner.id}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245, 158, 11, 0.04)' : undefined,
                    }}
                    onClick={() => onSelectOwner?.(owner.ownerId)}
                  >
                    <td
                      style={{ padding: '14px 12px 14px 18px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(owner.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{owner.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: owner.avatarBg,
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {owner.initial}
                        </div>
                        <span
                          style={{
                            fontWeight: '600',
                            color: '#ffffff',
                            fontSize: '13.5px',
                          }}
                        >
                          {owner.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#ffffff', fontSize: '13px' }}>{owner.phone}</span>
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>{owner.email}</span>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{owner.location}</td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                      {owner.cranes}
                    </td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                      {owner.bookings}
                    </td>
                    <td>{renderBadge('verification', owner.verification)}</td>
                    <td>{renderBadge('status', owner.status)}</td>
                    <td
                      style={{ textAlign: 'right', paddingRight: '20px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          title="View Owner Details"
                          onClick={() => onSelectOwner?.(owner.ownerId)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="cranzo-action-btn"
                          title="More options"
                          onClick={() => {}}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12.5px',
            color: '#94a3b8',
          }}
        >
          <span>Showing 1 to 10 of 186 owners</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="cranzo-action-btn"
              disabled={currentPage === 1}
              style={{ width: '28px', height: '28px' }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: '#f59e0b',
                color: '#0b111e',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              1
            </button>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              2
            </button>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              3
            </button>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              4
            </button>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              5
            </button>
            <span style={{ color: '#64748b', padding: '0 2px' }}>-</span>
            <button
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              19
            </button>
            <button
              type="button"
              className="cranzo-action-btn"
              style={{ width: '28px', height: '28px' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnersList;
