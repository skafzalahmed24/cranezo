import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Power,
  MapPin,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
  User,
  Radio,
  ChevronRight,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import craneThumbnailImg from '../../assets/crane_thumbnail.jpg';
import operatorAvatarImg from '../../assets/operator_avatar.jpg';

export const CraneDetails = ({ craneId = 'CRN-1045', onBack, onNavigateToBookings }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const recentBookings = [
    {
      id: 'CRZ10245',
      customer: 'Rahul Kumar',
      date: '08 Oct 2026',
      amount: '₹12,500',
      status: 'In Progress',
      statusColor: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.28)',
    },
    {
      id: 'CRZ10244',
      customer: 'Priya Sharma',
      date: '05 Oct 2026',
      amount: '₹18,000',
      status: 'Completed',
      statusColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
    },
    {
      id: 'CRZ10231',
      customer: 'Suresh Reddy',
      date: '28 Sep 2026',
      amount: '₹9,500',
      status: 'Completed',
      statusColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
    },
    {
      id: 'CRZ10218',
      customer: 'Kiran Mehta',
      date: '20 Sep 2026',
      amount: '₹15,000',
      status: 'Completed',
      statusColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
    },
    {
      id: 'CRZ10207',
      customer: 'Amit Verma',
      date: '12 Sep 2026',
      amount: '₹11,000',
      status: 'Cancelled',
      statusColor: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.28)',
    },
  ];

  return (
    <div className="cranzo-content-view animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
        <span
          onClick={onBack}
          style={{ cursor: 'pointer', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.target.style.color = '#64748b')}
        >
          Cranes
        </span>
        <ChevronRight size={14} />
        <span style={{ color: '#94a3b8' }}>Crane Details</span>
      </div>

      {/* Title Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            className="cranzo-btn-secondary"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              {craneId}
            </h2>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '9999px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Active
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{
              height: '38px',
              padding: '0 16px',
              border: '1px solid #f59e0b',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit2 size={14} />
            <span>Edit Crane</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{
              height: '38px',
              padding: '0 16px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Power size={14} />
            <span>Deactivate Crane</span>
          </button>
        </div>
      </div>

      {/* Hero Top Grid (Left Large Card + Right 2x2 Stats) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          gap: '18px',
          width: '100%',
        }}
      >
        {/* Left Hero Card */}
        <div
          className="cranzo-card"
          style={{
            display: 'flex',
            gap: '20px',
            padding: '20px',
            alignItems: 'stretch',
          }}
        >
          {/* Photos Column */}
          <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '100%',
                height: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#070D17',
              }}
            >
              <img
                src={craneThumbnailImg}
                alt="Crane Main"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Gallery Thumbnails */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              <div
                style={{
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid #f59e0b',
                }}
              >
                <img
                  src={operatorAvatarImg}
                  alt="Thumb 1"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                style={{
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <img
                  src={operatorAvatarImg}
                  alt="Thumb 2"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                style={{
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <img
                  src={craneThumbnailImg}
                  alt="Thumb 3"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                style={{
                  height: '48px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                +3
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                Mobile Crane
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
              CRN-1045 <span style={{ margin: '0 4px' }}>|</span> Registration No. TS-09-AB-1234
            </p>

            <div style={{ marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                Available
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} style={{ color: '#64748b' }} /> Crane Type
                </span>
                <span style={{ color: '#ffffff', fontWeight: '600' }}>Mobile Crane</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} style={{ color: '#64748b' }} /> Capacity
                </span>
                <span style={{ color: '#ffffff', fontWeight: '600' }}>50 Ton</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} style={{ color: '#64748b' }} /> Owner
                </span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>ABC Crane Services</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} style={{ color: '#64748b' }} /> Assigned Operator
                </span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>Ravi Kumar (OP-1001)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: '#64748b' }} /> Location
                </span>
                <span style={{ color: '#cbd5e1' }}>Hyderabad, Telangana</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={14} style={{ color: '#10b981' }} /> GPS Status
                </span>
                <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                  Online
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: '#64748b' }} /> Last Updated
                </span>
                <span style={{ color: '#94a3b8' }}>12 Oct 2026, 10:30 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2x2 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Card 1: Total Bookings */}
          <div className="cranzo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <TrendingUp size={11} /> +12.5%
              </span>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Bookings</span>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', marginTop: '2px' }}>
                84
              </div>
            </div>
          </div>

          {/* Card 2: Completed Jobs */}
          <div className="cranzo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <TrendingUp size={11} /> +8.3%
              </span>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Completed Jobs</span>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', marginTop: '2px' }}>
                76
              </div>
            </div>
          </div>

          {/* Card 3: GPS Connection */}
          <div className="cranzo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={18} />
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>GPS Connection</span>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Online
              </div>
            </div>
          </div>

          {/* Card 4: Documents */}
          <div className="cranzo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Documents</span>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>
                ✔ Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginTop: '6px',
        }}
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'owner-operator', label: 'Owner & Operator' },
          { id: 'documents', label: 'Documents' },
          { id: 'booking-history', label: 'Booking History' },
          { id: 'gps-maintenance', label: 'GPS & Maintenance' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === tab.id ? '#f59e0b' : '#94a3b8',
              fontWeight: activeTab === tab.id ? '700' : '500',
              fontSize: '13.5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview 3-Column Panels */}
      {activeTab === 'overview' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.3fr',
            gap: '18px',
            width: '100%',
          }}
        >
          {/* Panel 1: Crane Specifications */}
          <div className="cranzo-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: '0 0 16px 0' }}>
              Crane Specifications
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '12.5px' }}>
              {[
                { label: 'Crane Type', val: 'Mobile Crane' },
                { label: 'Capacity', val: '50 Ton' },
                { label: 'Make', val: 'Tadano' },
                { label: 'Model', val: 'ATF 50G-3' },
                { label: 'Year of Manufacture', val: '2020' },
                { label: 'Registration No.', val: 'TS-09-AB-1234' },
                { label: 'Chassis No.', val: 'TAD1234567890' },
                { label: 'Engine No.', val: 'ENG0987654321' },
                { label: 'Fuel Type', val: 'Diesel' },
                { label: 'Transmission', val: 'Automatic' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>{item.label}</span>
                  <span style={{ color: '#ffffff', fontWeight: '500' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 2: Location & Availability */}
          <div className="cranzo-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: '0 0 14px 0' }}>
              Location & Availability
            </h4>

            {/* Simulated Radar Map Graphic */}
            <div
              style={{
                width: '100%',
                height: '110px',
                borderRadius: '8px',
                background: 'radial-gradient(circle at center, #0e1e38 0%, #060c18 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                marginBottom: '14px',
              }}
            >
              {/* Radar Rings */}
              <div
                style={{
                  position: 'absolute',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(245, 158, 11, 0.25)',
                  left: '20px',
                  top: '10px',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  left: '40px',
                  top: '30px',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  left: '59px',
                  top: '49px',
                  boxShadow: '0 0 10px #f59e0b',
                }}
              />

              <div style={{ zIndex: 2, paddingLeft: '95px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                  Hyderabad, Telangana
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Last updated: 12 Oct 2026, 10:30 AM
                </span>
              </div>

              <button
                type="button"
                style={{
                  zIndex: 2,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#f59e0b',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                View on Map
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Current Location</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>Hyderabad, Telangana</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Availability Status</span>
                <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                  Available
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Base Location</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>Hyderabad Yard</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Radius</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>100 km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Working Hours</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>24/7</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Current Job</span>
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>No active job</span>
              </div>
            </div>
          </div>

          {/* Panel 3: Recent Booking History */}
          <div className="cranzo-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                Recent Booking History
              </h4>
              <button
                type="button"
                onClick={onNavigateToBookings}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f59e0b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                View All
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 4px', fontWeight: '600' }}>Booking ID</th>
                    <th style={{ padding: '6px 4px', fontWeight: '600' }}>Customer</th>
                    <th style={{ padding: '6px 4px', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '6px 4px', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '6px 4px', fontWeight: '600', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '10px 4px', color: '#ffffff', fontWeight: '600' }}>
                        {b.id}
                      </td>
                      <td style={{ padding: '10px 4px', color: '#cbd5e1' }}>{b.customer}</td>
                      <td style={{ padding: '10px 4px', color: '#64748b' }}>{b.date}</td>
                      <td style={{ padding: '10px 4px', color: '#ffffff', fontWeight: '600' }}>
                        {b.amount}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            color: b.statusColor,
                            background: b.bgColor,
                            border: `1px solid ${b.borderColor}`,
                          }}
                        >
                          {b.status === 'Completed' ? '✔ Completed' : b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CraneDetails;
