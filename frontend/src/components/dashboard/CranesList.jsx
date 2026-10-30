import React, { useState } from 'react';
import {
  Construction,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Search,
  Download,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import operatorAvatarImg from '../../assets/operator_avatar.jpg';

export const CranesList = ({ onSelectCrane, onAddCrane }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCapacity, setSelectedCapacity] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedOperator, setSelectedOperator] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [selectedDocs, setSelectedDocs] = useState('All');
  const [selectedGps, setSelectedGps] = useState('All');
  const [selectedRows, setSelectedRows] = useState([1]); // Match screenshot where first row is checked
  const [currentPage, setCurrentPage] = useState(1);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedCapacity('All');
    setSelectedOwner('All');
    setSelectedOperator('All');
    setSelectedAvailability('All');
    setSelectedDocs('All');
    setSelectedGps('All');
  };

  const statCards = [
    {
      id: 'total',
      label: 'Total Cranes',
      value: '342',
      trend: '+ 8.2%',
      trendDirection: 'up',
      color: 'amber',
      icon: Construction,
    },
    {
      id: 'available',
      label: 'Available Cranes',
      value: '186',
      trend: '+ 6.4%',
      trendDirection: 'up',
      color: 'green',
      icon: CheckCircle2,
    },
    {
      id: 'active',
      label: 'On Active Jobs',
      value: '78',
      trend: '+ 12.5%',
      trendDirection: 'up',
      color: 'blue',
      icon: Zap,
    },
    {
      id: 'attention',
      label: 'Attention Required',
      value: '18',
      trend: '+ 9.1%',
      trendDirection: 'up',
      color: 'amber',
      icon: AlertTriangle,
    },
  ];

  const initialCranes = [
    {
      id: 1,
      craneId: 'CRN-1045',
      regNumber: 'TS-09-AB-1234',
      type: 'Mobile Crane',
      capacity: '50 Ton',
      owner: 'ABC Crane Services',
      operator: 'Ravi Kumar',
      operatorId: 'OP-1001',
      location: 'Hyderabad',
      gps: 'Online',
      availability: 'Active',
      documents: 'Verified',
      status: 'Working',
    },
    {
      id: 2,
      craneId: 'CRN-1046',
      regNumber: 'TS-09-CD-5678',
      type: 'Tower Crane',
      capacity: '30 Ton',
      owner: 'XYZ Lifting',
      operator: 'Arun Kumar',
      operatorId: 'OP-1002',
      location: 'Vijayawada',
      gps: 'Online',
      availability: 'Available',
      documents: 'Verified',
      status: 'Available',
    },
    {
      id: 3,
      craneId: 'CRN-1047',
      regNumber: 'AP-05-EF-9021',
      type: 'Truck Crane',
      capacity: '25 Ton',
      owner: 'Reddy Cranes',
      operator: 'Mahesh Reddy',
      operatorId: 'OP-1003',
      location: 'Kakinada',
      gps: 'Offline',
      availability: 'Inactive',
      documents: 'Pending',
      status: 'Attention',
    },
    {
      id: 4,
      craneId: 'CRN-1048',
      regNumber: 'KA-03-GH-4455',
      type: 'Crawler Crane',
      capacity: '100 Ton',
      owner: 'Gupta Infra',
      operator: 'Sandeep Rao',
      operatorId: 'OP-1004',
      location: 'Bengaluru',
      gps: 'Online',
      availability: 'Active',
      documents: 'Verified',
      status: 'Working',
    },
    {
      id: 5,
      craneId: 'CRN-1049',
      regNumber: 'TN-07-IJ-7788',
      type: 'Rough Terrain Crane',
      capacity: '35 Ton',
      owner: 'Sri Cranes',
      operator: 'Ramesh Patel',
      operatorId: 'OP-1005',
      location: 'Chennai',
      gps: 'Online',
      availability: 'Active',
      documents: 'Verified',
      status: 'Available',
    },
    {
      id: 6,
      craneId: 'CRN-1050',
      regNumber: 'DL-01-KL-3344',
      type: 'All Terrain Crane',
      capacity: '120 Ton',
      owner: 'Patel Cranes',
      operator: 'Vikram Singh',
      operatorId: 'OP-1006',
      location: 'Delhi',
      gps: 'Offline',
      availability: 'Inactive',
      documents: 'Verified',
      status: 'Maintenance',
    },
    {
      id: 7,
      craneId: 'CRN-1051',
      regNumber: 'MH-02-MN-9988',
      type: 'Tower Crane',
      capacity: '45 Ton',
      owner: 'Omni Cranes',
      operator: 'Kiran Reddy',
      operatorId: 'OP-1007',
      location: 'Mumbai',
      gps: 'Online',
      availability: 'Active',
      documents: 'Verified',
      status: 'Working',
    },
    {
      id: 8,
      craneId: 'CRN-1052',
      regNumber: 'TS-10-OP-6677',
      type: 'Truck Crane',
      capacity: '20 Ton',
      owner: 'Mehta Infra',
      operator: 'Ajay Kumar',
      operatorId: 'OP-1008',
      location: 'Hyderabad',
      gps: 'Online',
      availability: 'Active',
      documents: 'Pending',
      status: 'Available',
    },
    {
      id: 9,
      craneId: 'CRN-1053',
      regNumber: 'PN-09-QR-2233',
      type: 'Mobile Crane',
      capacity: '60 Ton',
      owner: 'Apex Lifting',
      operator: 'Dinesh Rao',
      operatorId: 'OP-1009',
      location: 'Pune',
      gps: 'Offline',
      availability: 'Inactive',
      documents: 'Expired',
      status: 'Attention',
    },
    {
      id: 10,
      craneId: 'CRN-1054',
      regNumber: 'GJ-01-ST-8899',
      type: 'Crawler Crane',
      capacity: '120 Ton',
      owner: 'Kiran Cranes',
      operator: 'Prakash Verma',
      operatorId: 'OP-1010',
      location: 'Ahmedabad',
      gps: 'Online',
      availability: 'Active',
      documents: 'Verified',
      status: 'Working',
    },
  ];

  const filteredCranes = initialCranes.filter((crane) => {
    const matchesSearch =
      crane.craneId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crane.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crane.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crane.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crane.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crane.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'All' || crane.type === selectedType;
    const matchesCapacity = selectedCapacity === 'All' || crane.capacity === selectedCapacity;
    const matchesOwner = selectedOwner === 'All' || crane.owner === selectedOwner;
    const matchesOperator = selectedOperator === 'All' || crane.operator === selectedOperator;
    const matchesAvailability =
      selectedAvailability === 'All' || crane.availability === selectedAvailability;
    const matchesDocs = selectedDocs === 'All' || crane.documents === selectedDocs;
    const matchesGps = selectedGps === 'All' || crane.gps === selectedGps;

    return (
      matchesSearch &&
      matchesType &&
      matchesCapacity &&
      matchesOwner &&
      matchesOperator &&
      matchesAvailability &&
      matchesDocs &&
      matchesGps
    );
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredCranes.map((c) => c.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'working') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
          }}
        >
          Working
        </span>
      );
    }
    if (s === 'available') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#14b8a6',
            background: 'rgba(20, 184, 166, 0.12)',
            border: '1px solid rgba(20, 184, 166, 0.28)',
          }}
        >
          Available
        </span>
      );
    }
    if (s === 'attention') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
          }}
        >
          Attention
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: '600',
          padding: '3px 10px',
          borderRadius: '9999px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
        }}
      >
        Maintenance
      </span>
    );
  };

  const renderDocBadge = (doc) => {
    const d = doc.toLowerCase();
    if (d === 'verified') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
          }}
        >
          ✔ Verified
        </span>
      );
    }
    if (d === 'pending') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
          }}
        >
          Pending
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: '600',
          padding: '3px 10px',
          borderRadius: '9999px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
        }}
      >
        Expired
      </span>
    );
  };

  const renderAvailBadge = (avail) => {
    const a = avail.toLowerCase();
    if (a === 'active') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
          }}
        >
          Active
        </span>
      );
    }
    if (a === 'available') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '9999px',
            color: '#14b8a6',
            background: 'rgba(20, 184, 166, 0.12)',
            border: '1px solid rgba(20, 184, 166, 0.28)',
          }}
        >
          Available
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: '600',
          padding: '3px 10px',
          borderRadius: '9999px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
        }}
      >
        Inactive
      </span>
    );
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Crane Management
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manage the registered crane fleet across Cranzo.
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
            onClick={() => onAddCrane?.()}
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Add Crane</span>
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

      {/* Structured Two-Row Filter Card */}
      <div className="cranzo-filter-card">
        {/* Row 1 */}
        <div className="cranzo-filter-row">
          <div className="cranzo-filter-search-field">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search crane ID, type, owner, registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="cranzo-filter-dropdown"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="All">Crane Type</option>
            <option value="Mobile Crane">Mobile Crane</option>
            <option value="Tower Crane">Tower Crane</option>
            <option value="Truck Crane">Truck Crane</option>
            <option value="Crawler Crane">Crawler Crane</option>
            <option value="Rough Terrain Crane">Rough Terrain Crane</option>
            <option value="All Terrain Crane">All Terrain Crane</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={selectedCapacity}
            onChange={(e) => setSelectedCapacity(e.target.value)}
          >
            <option value="All">Capacity</option>
            <option value="20 Ton">20 Ton</option>
            <option value="25 Ton">25 Ton</option>
            <option value="30 Ton">30 Ton</option>
            <option value="35 Ton">35 Ton</option>
            <option value="45 Ton">45 Ton</option>
            <option value="50 Ton">50 Ton</option>
            <option value="60 Ton">60 Ton</option>
            <option value="100 Ton">100 Ton</option>
            <option value="120 Ton">120 Ton</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
          >
            <option value="All">Owner</option>
            <option value="ABC Crane Services">ABC Crane Services</option>
            <option value="XYZ Lifting">XYZ Lifting</option>
            <option value="Reddy Cranes">Reddy Cranes</option>
            <option value="Gupta Infra">Gupta Infra</option>
            <option value="Sri Cranes">Sri Cranes</option>
            <option value="Patel Cranes">Patel Cranes</option>
            <option value="Omni Cranes">Omni Cranes</option>
            <option value="Mehta Infra">Mehta Infra</option>
            <option value="Apex Lifting">Apex Lifting</option>
            <option value="Kiran Cranes">Kiran Cranes</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="cranzo-filter-row">
          <select
            className="cranzo-filter-dropdown"
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
          >
            <option value="All">Operator</option>
            <option value="Ravi Kumar">Ravi Kumar</option>
            <option value="Arun Kumar">Arun Kumar</option>
            <option value="Mahesh Reddy">Mahesh Reddy</option>
            <option value="Sandeep Rao">Sandeep Rao</option>
            <option value="Ramesh Patel">Ramesh Patel</option>
            <option value="Vikram Singh">Vikram Singh</option>
            <option value="Kiran Reddy">Kiran Reddy</option>
            <option value="Ajay Kumar">Ajay Kumar</option>
            <option value="Dinesh Rao">Dinesh Rao</option>
            <option value="Prakash Verma">Prakash Verma</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
          >
            <option value="All">Availability</option>
            <option value="Active">Active</option>
            <option value="Available">Available</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={selectedDocs}
            onChange={(e) => setSelectedDocs(e.target.value)}
          >
            <option value="All">Document Status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Expired">Expired</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={selectedGps}
            onChange={(e) => setSelectedGps(e.target.value)}
          >
            <option value="All">GPS Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>

          <button
            type="button"
            className="cranzo-filter-reset-btn"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Cranes Table Card */}
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
                      selectedRows.length === filteredCranes.length
                    }
                  />
                </th>
                <th style={{ width: '40px' }}>#</th>
                <th>Crane Details</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Owner</th>
                <th>Operator</th>
                <th>Location</th>
                <th>GPS</th>
                <th>Availability</th>
                <th>Documents</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCranes.map((crane) => {
                const isSelected = selectedRows.includes(crane.id);
                const isOnline = crane.gps === 'Online';

                return (
                  <tr
                    key={crane.id}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245, 158, 11, 0.04)' : undefined,
                    }}
                    onClick={() => onSelectCrane?.(crane.craneId)}
                  >
                    <td
                      style={{ padding: '14px 12px 14px 18px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(crane.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{crane.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Construction size={16} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13.5px' }}>
                            {crane.craneId}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>
                            {crane.regNumber}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{crane.type}</td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                      {crane.capacity}
                    </td>
                    <td style={{ color: '#ffffff', fontSize: '13px' }}>{crane.owner}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={operatorAvatarImg}
                          alt={crane.operator}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: '500' }}>
                            {crane.operator}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>
                            {crane.operatorId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{crane.location}</td>
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
                        {crane.gps}
                      </span>
                    </td>
                    <td>{renderAvailBadge(crane.availability)}</td>
                    <td>{renderDocBadge(crane.documents)}</td>
                    <td>{renderStatusBadge(crane.status)}</td>
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
          <span>Showing 1 to 10 of 342 cranes</span>
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
              35
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

export default CranesList;
