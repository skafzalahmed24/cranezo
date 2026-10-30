import React, { useState } from 'react';
import {
  Download,
  Filter,
  Search,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Zap,
  Check,
  XCircle,
  FileText,
} from 'lucide-react';

export const BookingsList = ({ onSelectBooking }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [craneType, setCraneType] = useState('All');
  const [owner, setOwner] = useState('All');
  const [operator, setOperator] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const statCards = [
    {
      id: 'all',
      label: 'All Bookings',
      value: '1,248',
      icon: FileText,
      color: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#f59e0b',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: '46',
      icon: Clock,
      color: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#f59e0b',
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      value: '182',
      icon: CheckCircle2,
      color: 'rgba(20, 184, 166, 0.15)',
      iconColor: '#14b8a6',
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      value: '78',
      icon: Zap,
      color: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38bdf8',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: '884',
      icon: Check,
      color: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10b981',
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      value: '58',
      icon: XCircle,
      color: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#ef4444',
    },
  ];

  const initialBookings = [
    {
      id: 1,
      bookingId: '#CRZ10245',
      customer: 'Rahul Kumar',
      crane: 'Mobile Crane (50 Ton)',
      owner: 'ABC Services',
      operator: 'Ravi Kumar',
      date: '08 Oct 2026',
      amount: '₹ 12,500',
      status: 'In Progress',
    },
    {
      id: 2,
      bookingId: '#CRZ10244',
      customer: 'Priya Sharma',
      crane: 'Tower Crane (30 Ton)',
      owner: 'XYZ Lifting',
      operator: 'Arun Kumar',
      date: '08 Oct 2026',
      amount: '₹ 18,000',
      status: 'Confirmed',
    },
    {
      id: 3,
      bookingId: '#CRZ10243',
      customer: 'Suresh Reddy',
      crane: 'Truck Crane (25 Ton)',
      owner: 'Reddy Cranes',
      operator: 'Mahesh',
      date: '07 Oct 2026',
      amount: '₹ 9,500',
      status: 'Pending',
    },
    {
      id: 4,
      bookingId: '#CRZ10242',
      customer: 'Anil Gupta',
      crane: 'Crawler Crane (100 Ton)',
      owner: 'Gupta Infra',
      operator: 'Sandeep',
      date: '07 Oct 2026',
      amount: '₹ 45,000',
      status: 'Completed',
    },
    {
      id: 5,
      bookingId: '#CRZ10241',
      customer: 'Neha Patel',
      crane: 'Mobile Crane (60 Ton)',
      owner: 'Patel Cranes',
      operator: 'Ramesh',
      date: '06 Oct 2026',
      amount: '₹ 22,000',
      status: 'Cancelled',
    },
    {
      id: 6,
      bookingId: '#CRZ10240',
      customer: 'Vikram Singh',
      crane: 'Tower Crane (40 Ton)',
      owner: 'Omni Cranes',
      operator: 'Ajay',
      date: '06 Oct 2026',
      amount: '₹ 16,000',
      status: 'Completed',
    },
    {
      id: 7,
      bookingId: '#CRZ10239',
      customer: 'Kavya Reddy',
      crane: 'Mobile Crane (25 Ton)',
      owner: 'Sri Cranes',
      operator: 'Kiran',
      date: '05 Oct 2026',
      amount: '₹ 11,000',
      status: 'In Progress',
    },
    {
      id: 8,
      bookingId: '#CRZ10238',
      customer: 'Arjun Mehta',
      crane: 'Truck Crane (50 Ton)',
      owner: 'Mehta Infra',
      operator: 'Dinesh',
      date: '05 Oct 2026',
      amount: '₹ 28,500',
      status: 'Confirmed',
    },
    {
      id: 9,
      bookingId: '#CRZ10237',
      customer: 'Pooja Iyer',
      crane: 'Crawler Crane (120 Ton)',
      owner: 'Apex Lifting',
      operator: 'Suresh',
      date: '04 Oct 2026',
      amount: '₹ 55,000',
      status: 'Pending',
    },
    {
      id: 10,
      bookingId: '#CRZ10236',
      customer: 'Karthik Rao',
      crane: 'Mobile Crane (35 Ton)',
      owner: 'Rao Cranes',
      operator: 'Mani',
      date: '04 Oct 2026',
      amount: '₹ 14,000',
      status: 'Completed',
    },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setBookingStatus('All');
    setPaymentStatus('All');
    setCraneType('All');
    setOwner('All');
    setOperator('All');
  };

  const filteredBookings = initialBookings.filter((b) => {
    const matchesSearch =
      b.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.operator.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = bookingStatus === 'All' || b.status === bookingStatus;
    const matchesCrane = craneType === 'All' || b.crane.toLowerCase().includes(craneType.toLowerCase());
    const matchesOwner = owner === 'All' || b.owner === owner;
    const matchesOperator = operator === 'All' || b.operator === operator;

    return matchesSearch && matchesStatus && matchesCrane && matchesOwner && matchesOperator;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredBookings.map((b) => b.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'In Progress':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
            }}
          >
            In Progress
          </span>
        );
      case 'Confirmed':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              color: '#14b8a6',
              background: 'rgba(20, 184, 166, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.28)',
            }}
          >
            Confirmed
          </span>
        );
      case 'Pending':
        return (
          <span
            style={{
              fontSize: '11px',
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
      case 'Completed':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
            }}
          >
            Completed
          </span>
        );
      case 'Cancelled':
      default:
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
            }}
          >
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="cranzo-content-view animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Bookings
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manage and monitor all crane bookings across Cranzo.
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
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          width: '100%',
        }}
      >
        {statCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.id}
              className="cranzo-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: card.color,
                  color: card.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComp size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>{card.label}</span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginTop: '2px' }}>
                  {card.value}
                </span>
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
              placeholder="Search booking ID, customer, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
            <Calendar
              size={15}
              style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Select Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                background: '#070D17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12.5px',
                padding: '0 12px 0 36px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            className="cranzo-filter-dropdown"
            value={bookingStatus}
            onChange={(e) => setBookingStatus(e.target.value)}
          >
            <option value="All">Booking Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="All">Payment Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="cranzo-filter-row">
          <select
            className="cranzo-filter-dropdown"
            value={craneType}
            onChange={(e) => setCraneType(e.target.value)}
          >
            <option value="All">Crane Type</option>
            <option value="Mobile Crane">Mobile Crane</option>
            <option value="Tower Crane">Tower Crane</option>
            <option value="Truck Crane">Truck Crane</option>
            <option value="Crawler Crane">Crawler Crane</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="All">Owner</option>
            <option value="ABC Services">ABC Services</option>
            <option value="XYZ Lifting">XYZ Lifting</option>
            <option value="Reddy Cranes">Reddy Cranes</option>
            <option value="Gupta Infra">Gupta Infra</option>
            <option value="Patel Cranes">Patel Cranes</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
          >
            <option value="All">Operator</option>
            <option value="Ravi Kumar">Ravi Kumar</option>
            <option value="Arun Kumar">Arun Kumar</option>
            <option value="Mahesh">Mahesh</option>
            <option value="Sandeep">Sandeep</option>
            <option value="Ramesh">Ramesh</option>
          </select>

          <button
            type="button"
            className="cranzo-filter-reset-btn"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Bookings Table */}
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
                      selectedRows.length === filteredBookings.length
                    }
                  />
                </th>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Crane</th>
                <th>Owner</th>
                <th>Operator</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const isSelected = selectedRows.includes(b.id);
                return (
                  <tr
                    key={b.id}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245, 158, 11, 0.04)' : undefined,
                    }}
                    onClick={() => onSelectBooking?.(b.bookingId)}
                  >
                    <td
                      style={{ padding: '14px 12px 14px 18px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(b.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                    </td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                      {b.bookingId}
                    </td>
                    <td style={{ color: '#ffffff', fontSize: '13px', fontWeight: '500' }}>
                      {b.customer}
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{b.crane}</td>
                    <td style={{ color: '#94a3b8', fontSize: '13px' }}>{b.owner}</td>
                    <td style={{ color: '#94a3b8', fontSize: '13px' }}>{b.operator}</td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{b.date}</td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                      {b.amount}
                    </td>
                    <td>{renderStatusBadge(b.status)}</td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
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
          <span>Showing 1 to 10 of 1,248 bookings</span>
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
              }}
            >
              1
            </button>
            <button type="button" className="cranzo-action-btn" style={{ width: '26px', height: '26px' }}>
              2
            </button>
            <button type="button" className="cranzo-action-btn" style={{ width: '26px', height: '26px' }}>
              3
            </button>
            <button type="button" className="cranzo-action-btn" style={{ width: '26px', height: '26px' }}>
              4
            </button>
            <button type="button" className="cranzo-action-btn" style={{ width: '26px', height: '26px' }}>
              5
            </button>
            <span style={{ padding: '0 4px', color: '#64748b' }}>..</span>
            <button type="button" className="cranzo-action-btn" style={{ width: '28px', height: '26px' }}>
              125
            </button>
            <button type="button" className="cranzo-action-btn" style={{ width: '28px', height: '28px' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
