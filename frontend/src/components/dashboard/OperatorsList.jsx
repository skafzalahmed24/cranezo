import React, { useState } from 'react';
import {
  Users,
  Wifi,
  Clock,
  HardHat,
  Search,
  Download,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import operatorAvatarImg from '../../assets/operator_avatar.jpg';

export const OperatorsList = ({ onSelectOperator }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [selectedCraneType, setSelectedCraneType] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const statCards = [
    {
      id: 'total',
      label: 'Total Operators',
      value: '274',
      trend: '+ 8.2%',
      trendDirection: 'up',
      color: 'amber',
      icon: Users,
    },
    {
      id: 'online',
      label: 'Online',
      value: '186',
      trend: '+ 6.4%',
      trendDirection: 'up',
      color: 'green',
      icon: Wifi,
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
      id: 'assigned',
      label: 'Assigned to Cranes',
      value: '210',
      trend: '+ 9.1%',
      trendDirection: 'up',
      color: 'blue',
      icon: HardHat,
    },
  ];

  const initialOperators = [
    {
      id: 1,
      operatorId: 'OP-1001',
      name: 'Ravi Kumar',
      phone: '+91 98765 43210',
      craneType: 'Mobile Crane',
      craneId: 'CRN-1045',
      tonnage: '(50 Ton)',
      location: 'Hyderabad',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '12 Jan 2026',
    },
    {
      id: 2,
      operatorId: 'OP-1002',
      name: 'Arun Kumar',
      phone: '+91 98765 43211',
      craneType: 'Tower Crane',
      craneId: 'CRN-1046',
      tonnage: '(30 Ton)',
      location: 'Vijayawada',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '15 Jan 2026',
    },
    {
      id: 3,
      operatorId: 'OP-1003',
      name: 'Mahesh Reddy',
      phone: '+91 98765 43212',
      craneType: 'Truck Crane',
      craneId: 'CRN-1047',
      tonnage: '(25 Ton)',
      location: 'Kakinada',
      availability: 'Offline',
      verification: 'Pending',
      status: 'Pending',
      joinedDate: '18 Jan 2026',
    },
    {
      id: 4,
      operatorId: 'OP-1004',
      name: 'Sandeep Rao',
      phone: '+91 98765 43213',
      craneType: 'Crawler Crane',
      craneId: 'CRN-1048',
      tonnage: '(100 Ton)',
      location: 'Bengaluru',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '20 Jan 2026',
    },
    {
      id: 5,
      operatorId: 'OP-1005',
      name: 'Ramesh Patel',
      phone: '+91 98765 43214',
      craneType: 'Mobile Crane',
      craneId: 'CRN-1050',
      tonnage: '(35 Ton)',
      location: 'Chennai',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '22 Jan 2026',
    },
    {
      id: 6,
      operatorId: 'OP-1006',
      name: 'Vikram Singh',
      phone: '+91 98765 43215',
      craneType: 'Tower Crane',
      craneId: 'CRN-1051',
      tonnage: '(45 Ton)',
      location: 'Delhi',
      availability: 'Offline',
      verification: 'Verified',
      status: 'Inactive',
      joinedDate: '25 Jan 2026',
    },
    {
      id: 7,
      operatorId: 'OP-1007',
      name: 'Kiran Reddy',
      phone: '+91 98765 43216',
      craneType: 'Truck Crane',
      craneId: 'CRN-1052',
      tonnage: '(20 Ton)',
      location: 'Hyderabad',
      availability: 'Online',
      verification: 'Pending',
      status: 'Pending',
      joinedDate: '28 Jan 2026',
    },
    {
      id: 8,
      operatorId: 'OP-1008',
      name: 'Ajay Kumar',
      phone: '+91 98765 43217',
      craneType: 'Mobile Crane',
      craneId: 'CRN-1053',
      tonnage: '(60 Ton)',
      location: 'Pune',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '30 Jan 2026',
    },
    {
      id: 9,
      operatorId: 'OP-1009',
      name: 'Dinesh Rao',
      phone: '+91 98765 43218',
      craneType: 'Crawler Crane',
      craneId: 'CRN-1054',
      tonnage: '(120 Ton)',
      location: 'Ahmedabad',
      availability: 'Offline',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '02 Feb 2026',
    },
    {
      id: 10,
      operatorId: 'OP-1010',
      name: 'Prakash Verma',
      phone: '+91 98765 43219',
      craneType: 'Tower Crane',
      craneId: 'CRN-1055',
      tonnage: '(60 Ton)',
      location: 'Mumbai',
      availability: 'Online',
      verification: 'Verified',
      status: 'Active',
      joinedDate: '05 Feb 2026',
    },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedVerification('All');
    setSelectedAvailability('All');
    setSelectedCraneType('All');
    setSelectedLocation('All');
  };

  const filteredOperators = initialOperators.filter((op) => {
    const matchesSearch =
      op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.phone.includes(searchQuery) ||
      op.operatorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification =
      selectedVerification === 'All' || op.verification === selectedVerification;

    const matchesAvailability =
      selectedAvailability === 'All' || op.availability === selectedAvailability;

    const matchesLocation =
      selectedLocation === 'All' || op.location === selectedLocation;

    return matchesSearch && matchesVerification && matchesAvailability && matchesLocation;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredOperators.map((o) => o.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Operators Management
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manage operators, verification, availability and crane assignments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Filter size={14} />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-primary-amber"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Add Operator</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
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

      {/* Filter Row */}
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
              placeholder="Search operator name, phone or operator..."
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
          </select>

          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
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
            <option value="All">Online / Offline</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>

          <select
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
            <option value="All">Assigned Status</option>
            <option value="Assigned">Assigned</option>
            <option value="Unassigned">Unassigned</option>
          </select>

          <select
            value={selectedCraneType}
            onChange={(e) => setSelectedCraneType(e.target.value)}
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
            <option value="All">Crane Type</option>
            <option value="Mobile Crane">Mobile Crane</option>
            <option value="Tower Crane">Tower Crane</option>
            <option value="Truck Crane">Truck Crane</option>
            <option value="Crawler Crane">Crawler Crane</option>
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
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
            <option value="All">Location</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Vijayawada">Vijayawada</option>
            <option value="Kakinada">Kakinada</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Chennai">Chennai</option>
            <option value="Delhi">Delhi</option>
            <option value="Pune">Pune</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>

        <div>
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
              padding: '0',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Operators Table */}
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
                      selectedRows.length === filteredOperators.length
                    }
                  />
                </th>
                <th style={{ width: '40px' }}>#</th>
                <th>OPERATOR</th>
                <th>CONTACT</th>
                <th>ASSIGNED CRANE</th>
                <th>LOCATION</th>
                <th>AVAILABILITY</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th>JOINED DATE</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperators.map((op) => {
                const isSelected = selectedRows.includes(op.id);
                const isOnline = op.availability === 'Online';
                const isVerified = op.verification === 'Verified';
                const isActive = op.status === 'Active';

                return (
                  <tr
                    key={op.id}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245, 158, 11, 0.04)' : undefined,
                    }}
                    onClick={() => onSelectOperator?.(op.operatorId)}
                  >
                    <td
                      style={{ padding: '14px 12px 14px 18px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(op.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{op.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={operatorAvatarImg}
                          alt={op.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13.5px' }}>
                            {op.name}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>{op.operatorId}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{op.phone}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#ffffff', fontSize: '13px' }}>{op.craneType}</span>
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                          {op.craneId} {op.tonnage}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{op.location}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isOnline ? '#10b981' : '#ef4444',
                          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: isOnline ? '#10b981' : '#ef4444',
                          }}
                        />
                        {op.availability}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isVerified ? '#10b981' : '#f59e0b',
                          background: isVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'}`,
                        }}
                      >
                        {isVerified ? '✔ Verified' : '● Pending'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isActive ? '#10b981' : op.status === 'Pending' ? '#f59e0b' : '#ef4444',
                          background: isActive
                            ? 'rgba(16, 185, 129, 0.12)'
                            : op.status === 'Pending'
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${
                            isActive
                              ? 'rgba(16, 185, 129, 0.28)'
                              : op.status === 'Pending'
                              ? 'rgba(245, 158, 11, 0.28)'
                              : 'rgba(239, 68, 68, 0.28)'
                          }`,
                        }}
                      >
                        ● {op.status}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '12.5px' }}>{op.joinedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
          <span>Showing 1 to 10 of 274 operators</span>
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
              28
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

export default OperatorsList;
