import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Ban,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  Construction,
  HardHat,
  IndianRupee,
  FileText,
  Building,
  Check,
} from 'lucide-react';

export const OwnerDetails = ({ ownerId = 'OWN-1001', onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Cranes', label: 'Cranes (12)' },
    { id: 'Operators', label: 'Operators (5)' },
    { id: 'Bookings', label: 'Bookings (84)' },
    { id: 'Documents', label: 'Documents (4)' },
  ];

  const recentBookings = [
    {
      id: '#CRZ10245',
      craneType: 'Mobile Crane (50 Ton)',
      date: '08 Oct 2026',
      amount: '₹ 12,500',
      status: 'In Progress',
      statusColor: '#60a5fa',
      statusBg: 'rgba(59, 130, 246, 0.12)',
      statusBorder: 'rgba(59, 130, 246, 0.25)',
    },
    {
      id: '#CRZ10244',
      craneType: 'Tower Crane (30 Ton)',
      date: '05 Oct 2026',
      amount: '₹ 18,000',
      status: 'Completed',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      statusBorder: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: '#CRZ10231',
      craneType: 'Truck Crane (25 Ton)',
      date: '28 Sep 2026',
      amount: '₹ 9,500',
      status: 'Completed',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      statusBorder: 'rgba(16, 185, 129, 0.25)',
    },
  ];

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 0 8px 0',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Owners</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Owner Details
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
              }}
            >
              <Check size={11} strokeWidth={3} />
              Verified
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            View complete details, documents and activity of this owner.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit2 size={14} color="#f59e0b" />
            <span>Edit Owner</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-danger-outline"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Ban size={14} />
            <span>Block Owner</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div
        className="cranzo-card"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
          {/* Logo Circle */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#eab308',
              color: '#0b111e',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: '800',
              fontSize: '11px',
              lineHeight: 1.1,
              padding: '6px',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '900' }}>ABC</span>
            <span style={{ fontSize: '8px', letterSpacing: '-0.3px' }}>CRANES</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                ABC Crane Services
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Owner • ID : {ownerId}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Active
                </span>
              </div>
            </div>

            {/* Contacts Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                marginTop: '12px',
                flexWrap: 'wrap',
                fontSize: '13px',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#64748b" />
                <span>+91 98765 43210</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#64748b" />
                <span>abc@cranes.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#ef4444" />
                <span>Hyderabad, Telangana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metadata Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>Business Type</div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600', marginTop: '3px' }}>
              Private Limited
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>GST Number</div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600', marginTop: '3px' }}>
              36ABCDE1234F125
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>Registration Date</div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600', marginTop: '3px' }}>
              10 Jan 2026
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginTop: '6px',
          paddingBottom: '2px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '10px 4px 12px',
                fontSize: '13.5px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#f59e0b' : '#94a3b8',
                borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4 Stat Cards in Overview */}
      <div className="cranzo-stats-grid-4" style={{ marginTop: '4px' }}>
        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Construction size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Total Cranes</span>
              <span className="cranzo-stat-value">12</span>
            </div>
          </div>
        </div>

        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
              <HardHat size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Total Operators</span>
              <span className="cranzo-stat-value">5</span>
            </div>
          </div>
        </div>

        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Calendar size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Total Bookings</span>
              <span className="cranzo-stat-value">84</span>
            </div>
          </div>
        </div>

        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
              <IndianRupee size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Total Earnings</span>
              <span className="cranzo-stat-value">₹ 1,84,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Business Information & Verification Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Business Information */}
        <div className="cranzo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Building size={16} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Business Information
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Company Name</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>ABC Crane Services</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Contact Person</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>Ramesh Kumar</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Email Address</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>abc@cranes.com</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Phone Number</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>+91 98765 43210</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b', flexShrink: 0, width: '110px' }}>Address</span>
              <span style={{ color: '#ffffff', fontWeight: '500', textAlign: 'right' }}>
                Plot No. 12, Industrial Area, Hyderabad, Telangana - 500072
              </span>
            </div>
          </div>
        </div>

        {/* Right: Verification Status */}
        <div className="cranzo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#3b82f6" />
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                Verification Status
              </h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
              }}
            >
              ✔ Verified
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Business Registration',
              'GST Certificate',
              'PAN Card',
              'Address Proof',
            ].map((docName, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                  <Check size={13} color="#10b981" strokeWidth={3} />
                  <span>{docName}</span>
                </div>
                <span
                  style={{
                    color: '#10b981',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ● Verified
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="cranzo-card" style={{ padding: '22px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Recent Bookings
            </h4>
          </div>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f59e0b',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            View All
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="cranzo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Crane Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ color: '#ffffff', fontWeight: '600' }}>{b.id}</td>
                  <td style={{ color: '#cbd5e1' }}>{b.craneType}</td>
                  <td style={{ color: '#94a3b8' }}>{b.date}</td>
                  <td style={{ color: '#ffffff', fontWeight: '600' }}>{b.amount}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        color: b.statusColor,
                        background: b.statusBg,
                        border: `1px solid ${b.statusBorder}`,
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDetails;
